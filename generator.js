var readlineSync = require('readline-sync');
const artifacts = require('./build/contracts/CrowdsaleGenerator.json');
const tokenartifacts = require('./build/contracts/TokenGenerator.json');
const contract = require('truffle-contract');
let CrowdsaleGenerator = contract(artifacts);
let TokenGenerator = contract(tokenartifacts);
const Web3 = require('web3');

if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
} else {
  // set the provider you want from Web3.providers
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

CrowdsaleGenerator.setProvider(web3.currentProvider);
//dirty hack for web3@1.0.0 support for localhost testrpc, see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
if (typeof CrowdsaleGenerator.currentProvider.sendAsync !== "function") {
  CrowdsaleGenerator.currentProvider.sendAsync = function() {
    return CrowdsaleGenerator.currentProvider.send.apply(
      CrowdsaleGenerator.currentProvider, arguments
    );
  };
}

TokenGenerator.setProvider(web3.currentProvider);
//dirty hack for web3@1.0.0 support for localhost testrpc, see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
if (typeof TokenGenerator.currentProvider.sendAsync !== "function") {
  TokenGenerator.currentProvider.sendAsync = function() {
    return TokenGenerator.currentProvider.send.apply(
      TokenGenerator.currentProvider, arguments
    );
  };
}

///////////////////
//Crowdsale params

let startTime;
let endTime;
let wallet;
let rate;
let tokenCap;
let minContribution;
let maxContribution;
let tokenName;
let tokenSymbol;
let tokenDecimals;

////////////////////////

let crowdsaleGenerator;

// App flow
let index_mainmenu;

let accounts;

let _DEBUG = true;

async function executeApp() {

  accounts = await web3.eth.getAccounts();

  console.log("******************************************")
  console.log("Welcome to the Command-Line ICO Generator.");
  console.log("******************************************")
  console.log("What would you like to do today?");

  index_mainmenu = readlineSync.keyInSelect(["Create new ICO","Participate in existing ICO"], 'Choose an option:');

  switch (index_mainmenu) {
    case 0: // New ICO
      createICO();
      break;
    case 1: // Manage
      manageICO("");
      break;
    case 2: //Cancel
      break;
  }
};

async function createICO() {

  console.log("******************************************")
  console.log("New ICO Creation");
  console.log("****************************************** \n")
  console.log("The following script will create a new ICO\nwith its corresponding mintable token,\naccording to the paramters you enter.");

  if(_DEBUG){
    console.log('\x1b[31m%s\x1b[0m',"Warning: Debugging is activated. Start and End dates will be adjusted for easier testing.");
  }

  let start = readlineSync.question('Press enter to continue or exit (CTRL + C): ', {
    defaultInput: 'Y'
  });

  if(start != "Y") return;

  console.log("\n");
  console.log('\x1b[34m%s\x1b[0m',"Token Creation - Step 1: Token Name");
  tokenName =  readlineSync.question('Enter a name for your new token: ');
  console.log("You entered: ", tokenName, "\n");

  console.log('\x1b[34m%s\x1b[0m',"Token Creation - Step 2: Token Symbol");
  tokenSymbol =  readlineSync.question('Enter a symbol for '+tokenName+': ');
  console.log("You entered: ", tokenSymbol, "\n");

  console.log('\x1b[34m%s\x1b[0m',"Token Creation - Step 3: Decimals");
  tokenDecimals =  readlineSync.questionInt('How many decimals will '+tokenName+' token ('+tokenSymbol+')'+' have?: ');
  console.log("You entered: ", tokenDecimals, "\n");

  console.log('\x1b[43m%s\x1b[0m',tokenName + ' token ('+tokenSymbol+') ' + 'with '+ tokenDecimals +' decimals will be used for the ICO.');
  console.log("\n");

  /////////////
  // Start Date

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 1: Start date");
  startTime =  readlineSync.question('Choose a start date for the crowdsale: ');
  console.log("You chose: ", startTime, "\n");

  ///////////
  // End Date

  var options_endTime = {limit: function(input) {
    return (startTime <= parseInt(input));
  },limitMessage: "Please enter an end time later than the start time"};

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 2: End date");
  endTime =  readlineSync.question('Choose an end date for the crowdsale: ',options_endTime);
  console.log("You chose: ", endTime, "\n");

  /////////
  // Wallet

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 3: Wallet address");
  wallet =  readlineSync.question('Enter an ETH address to be used as wallet (funds will be transferred to this account): ');
  console.log("You chose: ", wallet, "\n");

  /////////
  // Rate

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 4: ETH to " + tokenSymbol + " exchange rate.");
  rate =  readlineSync.questionInt('Enter the exchange rate for your token (1 ETH = x '+ tokenSymbol+ '): ');
  console.log("Each 1 ETH will yield "+ rate +" "+ tokenSymbol + "\n");

  ////////////
  // ICO Token Cap

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 5: Token Cap");
  tokenCap =  readlineSync.questionInt('What will be the maximum tokens to be minted? (Token Cap): ');
  tokenCap = tokenCap * 10 ** tokenDecimals;
  console.log("The ICO will mint and distribute a maximum of " + tokenCap + " tokens.\n");

  ///////////////////
  // Min contribution

  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 6: Minimum allowed contribution");
  minContribution =  readlineSync.questionFloat('What will be the minimum possible contribution? (in ether) ');
  console.log("The minimum allowed contribution will be " + minContribution + " ether.\n");

  ///////////////////
  // Max contribution

  var options_maxContrib = {limit: function(input) {
    return (minContribution < parseFloat(input));
  },limitMessage: "Please enter a maximum contribution higher than the minimum contribution."};


  console.log('\x1b[34m%s\x1b[0m',"ICO Creation - Step 7: Maximum allowed contribution");
  maxContribution =  readlineSync.question('What will be the maximum possible contribution? (in wei) ',options_maxContrib);
  console.log("The maximum allowed contribution will be " + maxContribution + " wei.\n");

  if(_DEBUG){
    startTime = Math.floor(new Date().getTime() /1000);
    endTime = Math.floor(new Date().getTime() /1000 + (3600 * 24 * 30));

    console.log('\x1b[31m%s\x1b[0m',"Warning: Debugging is activated. Start and End dates have been modified");
  }

  console.log("----------------------------------------------------");
  console.log('\x1b[34m%s\x1b[0m',"Please review the information you entered:");
  console.log("Token name: ", tokenName);
  console.log("Token symbol: ", tokenSymbol);
  console.log("Token decimals: ", tokenDecimals);
  console.log("Start date: ", startTime);
  console.log("End date: ", endTime);
  console.log("Wallet: ", wallet);
  console.log("Exchange rate: ", rate);
  console.log("Token Cap: ", tokenCap);
  console.log("Minimum contribution (in ether): ", minContribution);
  console.log("Maximum contribution (in ether): ", maxContribution);
  console.log("----------------------------------------------------");
  // ICO creation

  let token;

  try{

    crowdsaleGenerator = await CrowdsaleGenerator.new(
      startTime, endTime, wallet, rate,
      tokenCap, web3.utils.toWei(minContribution.toString(10),"ether"),
      web3.utils.toWei(maxContribution.toString(10),"ether"),
      tokenName, tokenSymbol, tokenDecimals,
      {from:accounts[0],gas:4000000});

    let tokenAddress = await crowdsaleGenerator.token({from:accounts[0],gas:2000000});
    token = await TokenGenerator.at(tokenAddress);

    console.log("\n")
    console.log('\x1b[42m%s\x1b[0m',"Congratulations! The ICO was successfully generated.")
    console.log('\x1b[43m%s\x1b[0m',"ICO Address: " + crowdsaleGenerator.address.valueOf());
    console.log('\x1b[43m%s\x1b[0m',"TOKEN Address: "+ token.address.valueOf());

  } catch (err){
    console.log(err);
  }

  executeApp();

};

async function manageICO(crowdsale) {

  console.log("******************************************")
  console.log("Participate in existing ICO");
  console.log("******************************************\n")

  let token;

  while(!crowdsale){
    let crowdsaleAddress =  readlineSync.question('Enter the address of an existing ICO: ');
    try{
      crowdsale  = await CrowdsaleGenerator.at(crowdsaleAddress,{from:accounts[0],gas:1000000});
    } catch (err){
      console.log("Please enter the address of an existing contract.");
    }
  }

  let tokenAddress = await crowdsale.token();
  token  = await TokenGenerator.at(tokenAddress,{from:accounts[0],gas:1000000});

  let tokenDecimals = parseInt((await token.decimals()).toString(10));
  let tokenSymbol = await token.symbol();
  let tokensMinted = parseInt((await crowdsale.tokensMintedForSale()).toString(10));
  let tokenCap = parseInt((await crowdsale.tokenCap()).toString(10));
  let crowdsaleProgress = Math.floor(tokensMinted * 100 / tokenCap);
  let startTime = parseInt((await crowdsale.startTime()).toString(10));
  let endTime = parseInt((await crowdsale.endTime()).toString(10));
  let currentTime = Math.floor(new Date().getTime() /1000);
  let minContribution = (await crowdsale.minContribution()).toString(10);
  let maxContribution = (await crowdsale.maxContribution()).toString(10);

  let contribution = (await crowdsale.contributions(accounts[0])).toString(10);

  let weiRaised = (await crowdsale.weiRaised()).toString(10);

  console.log("----------------------------------------------------");
  console.log('\x1b[34m%s\x1b[0m',"ICO information:");
  console.log("Token name: ",await token.name());
  console.log("Token symbol: ", tokenSymbol);
  console.log("Token decimals: ", tokenDecimals);
  console.log("Start date: ", startTime);
  console.log("End date: ", endTime);
  console.log("Wallet: ", await crowdsale.wallet());
  console.log("Exchange rate: 1 ETH =", (await crowdsale.rate()).toString(10), tokenSymbol);
  console.log("Token Cap: ", tokenCap.toString(10));
  console.log("Minimum contribution (in ETH): ", web3.utils.fromWei(minContribution,"ether"));
  console.log("Maximum contribution (in ETH): ", web3.utils.fromWei(maxContribution,"ether"));
  console.log("----------------------------------------------------\n");


  console.log("You have already contributed",web3.utils.fromWei(contribution,"ether"),"ether");
  console.log("You can contribute up to",maxContribution,"ether");

  console.log("Ether raised: ",web3.utils.fromWei(weiRaised,'ether'));
  console.log("Tokens minted: ",tokensMinted.toString(10), "of", tokenCap.toString(10));
  console.log("Crowdsale progress: "+ crowdsaleProgress +"%");
  console.log("Time remaining:",Math.floor((endTime - currentTime)/3600),"hours", "("+Math.floor((endTime - currentTime)/(3600*24))+" days)");

  let contributionsAccepted = true;
  if(tokensMinted == tokenCap){
    console.log('\x1b[46m%s\x1b[0m',"Crowdsale cap reached. No further contributions accepted.");
    contributionsAccepted = false;
  }

  if(currentTime >= endTime){
    console.log('\x1b[46m%s\x1b[0m',"Crowdsale has already ended. No further contributions accepted.");
    contributionsAccepted = false;
  }

  if(parseInt(contribution) >= parseInt(maxContribution)){
    console.log('\x1b[46m%s\x1b[0m',"You have already contributed the maximum ether you are allowed.");
    contributionsAccepted = false;
  }

  if(contributionsAccepted)
    contributeToICO(crowdsale);

};

async function contributeToICO(crowdsale) {
  let userBalance = await web3.eth.getBalance(accounts[0]);

  console.log("How much (in ether) would you like to contribute?");
  let contribution =  readlineSync.question('(The balance in account ' + accounts[0] + ' is '+ web3.utils.fromWei(userBalance,'ether') + ' ether): ');

  try{
    console.log(web3.utils.toWei(contribution,'ether'));
    await crowdsale.buyTokens(accounts[0],{from:accounts[0],gas:2000000, value:web3.utils.toWei(contribution,'ether')});
  } catch (err){
    console.log(err);
  }
  manageICO(crowdsale);
}

executeApp();
