// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IOBRouter {
    struct swapTokenInfo {
        address inputToken;
        uint256 inputAmount;
        address outputToken;
        uint256 outputQuote;
        uint256 outputMin;
        address outputReceiver;
    }

    function swap(
        swapTokenInfo memory tokenInfo,
        bytes calldata pathDefinition,
        address executor,
        uint32 referralCode
    ) external payable returns (uint256 amountOut);
}

contract DCAStrategy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum StrategyStatus {
        None,
        Active,
        Cancelled,
        Completed
    }

    IOBRouter public router;

    struct Strategy {
        address tokenIn;
        address tokenOut;
        uint256 amountPerSwap;
        uint256 nextSwapTime;
        uint256 intervalSeconds;
        uint256 ordersAmount;
        StrategyStatus status;
    }

    mapping(address => mapping(address => uint256)) public userBalances;
    mapping(address => Strategy[]) public strategies;

    constructor(address _router) Ownable(msg.sender) {
        router = IOBRouter(_router);
    }

    // --- Events ---

    event TokensDeposited(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event TokensWithdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event StrategyCreated(
        address indexed user,
        uint256 indexed strategyId,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountPerSwap,
        uint256 intervalSeconds,
        uint256 ordersAmount
    );
    event StrategyCancelled(
        address indexed user,
        uint256 indexed strategyId,
        address indexed tokenIn,
        uint256 amount
    );
    event SwapExecuted(
        address indexed user,
        uint256 indexed strategyId,
        uint256 outputAmount
    );

    // --- Functions ---

    function depositTokens(address token, uint256 amount) external {
        require(amount > 0, "Zero amount");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender][token] += amount;

        emit TokensDeposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(
            userBalances[msg.sender][token] >= amount,
            "Insufficient balance"
        );

        userBalances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokensWithdrawn(msg.sender, token, amount);
    }

    function createStrategy(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountPerSwap,
        uint256 intervalSeconds,
        uint256 ordersAmount
    ) external onlyOwner {
        uint256 totalAmount = amountPerSwap * ordersAmount;
        require(
            userBalances[user][tokenIn] >= totalAmount,
            "Insufficient contract balance"
        );

        strategies[user].push(
            Strategy({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountPerSwap: amountPerSwap,
                nextSwapTime: block.timestamp,
                intervalSeconds: intervalSeconds,
                ordersAmount: ordersAmount,
                status: StrategyStatus.Active
            })
        );

        uint256 strategyId = strategies[user].length - 1;

        emit StrategyCreated(
            user,
            strategyId,
            tokenIn,
            tokenOut,
            amountPerSwap,
            intervalSeconds,
            ordersAmount
        );
    }

    function cancelStrategy(address user, uint256 strategyId)
        external
        onlyOwner
        nonReentrant
    {
        _cancelStrategy(user, strategyId);
    }

    function cancelMyStrategy(uint256 strategyId) external nonReentrant {
        _cancelStrategy(msg.sender, strategyId);
    }

    function _cancelStrategy(address user, uint256 strategyId) internal {
        require(strategyId < strategies[user].length, "Invalid strategyId");

        Strategy storage s = strategies[user][strategyId];
        require(s.status == StrategyStatus.Active, "Strategy not active");

        uint256 refundAmount = s.ordersAmount * s.amountPerSwap;

        require(
            userBalances[user][s.tokenIn] >= refundAmount,
            "Insufficient balance to refund"
        );

        userBalances[user][s.tokenIn] -= refundAmount;
        s.status = StrategyStatus.Cancelled;

        IERC20(s.tokenIn).safeTransfer(user, refundAmount);

        emit StrategyCancelled(user, strategyId, s.tokenIn, refundAmount);
    }

    function executeSwap(
        address user,
        uint256 strategyId,
        bytes calldata pathDefinition,
        uint256 outputQuote,
        uint256 outputMin,
        uint32 referralCode
    ) external onlyOwner nonReentrant {
        require(strategyId < strategies[user].length, "Invalid strategyId");

        Strategy storage s = strategies[user][strategyId];

        require(s.status == StrategyStatus.Active, "Strategy not active");
        require(block.timestamp >= s.nextSwapTime, "Too early");
        require(
            userBalances[user][s.tokenIn] >= s.amountPerSwap,
            "Insufficient contract balance"
        );
        require(
            IERC20(s.tokenIn).approve(address(router), 0),
            "Reset approve failed"
        );
        require(
            IERC20(s.tokenIn).approve(address(router), s.amountPerSwap),
            "Approve failed"
        );

        userBalances[user][s.tokenIn] -= s.amountPerSwap;

        IOBRouter.swapTokenInfo memory tokenInfo = IOBRouter.swapTokenInfo({
            inputToken: s.tokenIn,
            inputAmount: s.amountPerSwap,
            outputToken: s.tokenOut,
            outputQuote: outputQuote,
            outputMin: outputMin,
            outputReceiver: user
        });

        try
            router.swap(tokenInfo, pathDefinition, address(this), referralCode)
        returns (uint256 outputAmount) {
            s.nextSwapTime = block.timestamp + s.intervalSeconds;
            s.ordersAmount -= 1;

            emit SwapExecuted(user, strategyId, outputAmount);

            if (s.ordersAmount == 0) {
                s.status = StrategyStatus.Completed;
            }
        } catch {
            userBalances[user][s.tokenIn] += s.amountPerSwap;
            revert("Swap failed");
        }
    }

    function getStrategiesCount(address user) external view returns (uint256) {
        return strategies[user].length;
    }

    function getStrategy(address user, uint256 strategyId)
        external
        view
        returns (Strategy memory)
    {
        require(strategyId < strategies[user].length, "Invalid strategyId");

        return strategies[user][strategyId];
    }
}
