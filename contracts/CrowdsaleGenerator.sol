pragma solidity ^0.4.18;

import './TokenGenerator.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract CrowdsaleGenerator is Pausable {
  using SafeMath for uint256;

  // The token being sold
  TokenGenerator public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // amount of raised money in wei
  uint256 public weiRaised;

  //Tokens minted/sold in the crowdsale
  uint256 public tokensMintedForSale;

  // Exchange rate ETH to TOKEN
  uint public rate;

  //keeps track of whether or not the crowdsale has ended.
  //Will be set to true either when the time is up or when the hard cap is reached
  bool public isFinalized = false;

  uint public tokenCap;
  uint public minContribution;
  uint public maxContribution;

  mapping (address => uint) public contributions;

  ////////////
  // EVENTS //
  ////////////

  event Finalized();

  ///////////////
  // MODIFIERS //
  ///////////////

  modifier onlyDuringSale() {
        require(hasStarted() && !hasEnded());
        _;
    }

  modifier onlyAfterSale() {
      // require finalized is stronger than hasSaleEnded
      require(hasEnded());
      _;
  }

  /////////////////////////////////////////

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function CrowdsaleGenerator(
    uint256 _startTime,
    uint256 _endTime,
    address _wallet,
    uint _rate,
    uint _tokenCap,
    uint _minContribution,
    uint _maxContribution,
    string _tokenName,
    string _tokenSymbol,
    uint8 _tokenDecimals
    ) public {

    require(_startTime >= now);
    require(_endTime > _startTime);
    require(_wallet != address(0));
    require(_minContribution > 0);
    require(_maxContribution >= _minContribution);

    //Standard crowdsale parameters
    startTime = _startTime;
    endTime = _endTime;
    wallet = _wallet;
    rate = _rate;

    //Crowdsale config
    tokenCap = _tokenCap;
    minContribution = _minContribution;
    maxContribution = _maxContribution;

    //Token config
    token = createTokenContract(_tokenName,_tokenSymbol,_tokenDecimals);
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific mintable token.
  function createTokenContract(string _tokenName,string _tokenSymbol,uint8 _tokenDecimals)
  internal returns (TokenGenerator) {
    return new TokenGenerator(_tokenName,_tokenSymbol,_tokenDecimals);
  }


  // fallback function can be used to buy tokens
  function () public payable whenNotPaused onlyDuringSale {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable whenNotPaused onlyDuringSale {
    require(beneficiary != address(0));
    require(msg.value >= minContribution);

    require(contributions[msg.sender].add(msg.value) <= maxContribution);

    //contribution received in wei
    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 exchangeRate = calculateTierBonus();
    uint256 tokens = weiAmount.mul(exchangeRate).div(10 ** (18 - uint(token.decimals())));

    // Make sure we don't sell more tokens than those available to the crowdsale
    // TBD change this so we can sell the difference.
    require (tokensMintedForSale.add(tokens) <= tokenCap);

    // update state
    weiRaised = weiRaised.add(weiAmount);  //Keep track of wei raised
    contributions[msg.sender] = contributions[msg.sender].add(weiAmount);

    tokensMintedForSale = tokensMintedForSale.add(tokens); //Keep track of tokens sold

    token.mint(beneficiary, tokens);

    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    // If all tokens available for sale have been sold, finalize the sale automatically.
    if (tokensMintedForSale == tokenCap) {
        finalizeInternal();
    }

    forwardFunds();
  }

  //Calculate how many tokens correspond given the ether payed and the current tier.
  function calculateTierBonus() public view returns (uint256){

    if(now >= startTime && now <= endTime){
      return rate;
    }

    //SHOULD NOT be possible to buy tokens in the following cases.
    //Enforced by validPurchase() called in buyTokens().
    if(now < startTime || now > endTime){
      return 0;
    }

  }

  // The internal one will be called if tokens are sold out or
  // the end time for the sale is reached, in addition to being called
  // from the public version of finalize().
  function finalizeInternal() internal returns (bool) {
      require(!isFinalized);

      isFinalized = true;
      Finalized();
      return true;
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  //
  //Helper functions for onlyDuringSale / onlyAfterSale modifiers
  //

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    bool _saleIsOver = now > endTime;
    return _saleIsOver || isFinalized;
  }

  // @return true if crowdsale event has started
  function hasStarted() public constant returns (bool) {
    return now >= startTime;
  }

  //
  //Utility functions
  //

  function tellTime() public constant returns (uint) {
    return now;
  }


}
