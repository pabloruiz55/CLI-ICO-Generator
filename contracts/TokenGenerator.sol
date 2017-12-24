pragma solidity ^0.4.18;
import "zeppelin-solidity/contracts/token/MintableToken.sol";

/**
 * @title AwesomeToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract TokenGenerator is MintableToken {

  string public name;
  string public symbol;
  uint8 public decimals;

  function TokenGenerator(string _name, string _symbol, uint8 _decimals) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }
}
