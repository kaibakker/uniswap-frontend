import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { BigNumber as BN } from "bignumber.js";
import { selectors, addPendingTx } from '../../ducks/web3connect';
import Header from '../../components/Header';
import NavigationTabs from '../../components/NavigationTabs';
import AddressInputPanel from '../../components/AddressInputPanel';
import CurrencyInputPanel from '../../components/CurrencyInputPanel';
import ContextualInfo from '../../components/ContextualInfo';
import OversizedPanel from '../../components/OversizedPanel';

import BSKT_ABI from '../../abi/bskt';

import "./redeem.scss";
import promisify from "../../helpers/web3-promisfy";
import MediaQuery from "react-responsive";
import ReactGA from "react-ga";

const INPUT = 0;
const OUTPUT = 1;


class Redeem extends Component {
  static propTypes = {
    account: PropTypes.string,
    isConnected: PropTypes.bool.isRequired,
    selectors: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = {
    inputValue: '',
    outputValue: '',
    inputCurrency: 'ETH',
    outputCurrency: '0xf1e48f13768bd8114a530070b43257a63f24bb12',
    inputAmountB: '',
    lastEditedField: '',
    recipient: '',
    inputs: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
  };

  componentWillMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  reset() {
    this.setState({
      inputValue: '',
      outputValue: '',
      inputAmountB: '',
      lastEditedField: '',
      recipient: '',
    });
  }

  componentWillReceiveProps() {
    this.recalcForm();
  }

  validate() {
    const { selectors, account, web3 } = this.props;
    const {
      inputValue, outputValue,
      inputCurrency, outputCurrency,
      recipient,
    } = this.state;

    let inputError = '';
    let outputError = '';
    let isValid = true;
    // const validRecipientAddress = true;
    // const inputIsZero = BN(inputValue).isZero();
    // const outputIsZero = BN(outputValue).isZero();

    // if (!inputValue || inputIsZero || !outputValue || outputIsZero || !inputCurrency || !outputCurrency || !recipient || this.isUnapproved() || !validRecipientAddress) {
    //   isValid = false;
    // }

    // const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);

    // if (inputBalance.isLessThan(BN(inputValue * 10 ** inputDecimals))) {
    //   inputError = 'Insufficient Balance';
    // }

    // if (inputValue === 'N/A') {
    //   inputError = 'Not a valid input value';
    // }

    return {
      inputError,
      outputError,
      isValid: isValid && !inputError && !outputError,
    };
  }

  isUnapproved() {


    return false;
  }

  recalcForm() {
    const { inputCurrency, outputCurrency, lastEditedField } = this.state;

    if (!inputCurrency || !outputCurrency) {
      return;
    }

    const editedValue = lastEditedField === INPUT ? this.state.inputValue : this.state.outputValue;

    if (BN(editedValue).isZero()) {
      return;
    }

    if (inputCurrency === outputCurrency) {
      this.setState({
        inputValue: '',
        outputValue: '',
      });
      return;
    }

    if (inputCurrency !== 'ETH' && outputCurrency !== 'ETH') {
      this.recalcTokenTokenForm();
      return;
    }

    this.recalcEthTokenForm();
  }

  recalcTokenTokenForm = () => {
    const {
      exchangeAddresses: { fromToken },
      selectors,
    } = this.props;

    const {
      inputValue: oldInputValue,
      outputValue: oldOutputValue,
      inputCurrency,
      outputCurrency,
      lastEditedField,
      exchangeRate: oldExchangeRate,
      inputAmountB: oldInputAmountB,
    } = this.state;

    const exchangeAddressA = fromToken[inputCurrency];
    const exchangeAddressB = fromToken[outputCurrency];

    const { value: inputReserveA, decimals: inputDecimalsA } = selectors().getBalance(exchangeAddressA, inputCurrency);
    const { value: outputReserveA } = selectors().getBalance(exchangeAddressA, 'ETH');
    const { value: inputReserveB } = selectors().getBalance(exchangeAddressB, 'ETH');
    const { value: outputReserveB, decimals: outputDecimalsB } = selectors().getBalance(exchangeAddressB, outputCurrency);

    if (lastEditedField === INPUT) {
      if (!oldInputValue) {
        return this.setState({
          outputValue: '',
          exchangeRate: BN(0),
        });
      }

      const inputAmountA = BN(oldInputValue).multipliedBy(10 ** inputDecimalsA);
      const outputAmountA = calculateEtherTokenOutput({
        inputAmount: inputAmountA,
        inputReserve: inputReserveA,
        outputReserve: outputReserveA,
      });
      // Redundant Variable for readability of the formala
      // OutputAmount from the first redeem becomes InputAmount of the second redeem
      const inputAmountB = outputAmountA;
      const outputAmountB = calculateEtherTokenOutput({
        inputAmount: inputAmountB,
        inputReserve: inputReserveB,
        outputReserve: outputReserveB,
      });

      const outputValue = outputAmountB.dividedBy(BN(10 ** outputDecimalsB)).toFixed(7);
      const exchangeRate = BN(outputValue).dividedBy(BN(oldInputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (outputValue !== oldOutputValue) {
        appendState.outputValue = outputValue;
      }

      this.setState(appendState);
    }

    if (lastEditedField === OUTPUT) {
      if (!oldOutputValue) {
        return this.setState({
          inputValue: '',
          exchangeRate: BN(0),
        });
      }

      const outputAmountB = BN(oldOutputValue).multipliedBy(10 ** outputDecimalsB);
      const inputAmountB = calculateEtherTokenInput({
        outputAmount: outputAmountB,
        inputReserve: inputReserveB,
        outputReserve: outputReserveB,
      });

      // Redundant Variable for readability of the formala
      // InputAmount from the first redeem becomes OutputAmount of the second redeem
      const outputAmountA = inputAmountB;
      const inputAmountA = calculateEtherTokenInput({
        outputAmount: outputAmountA,
        inputReserve: inputReserveA,
        outputReserve: outputReserveA,
      });

      const inputValue = inputAmountA.isNegative()
        ? 'N/A'
        : inputAmountA.dividedBy(BN(10 ** inputDecimalsA)).toFixed(7);
      const exchangeRate = BN(oldOutputValue).dividedBy(BN(inputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (inputValue !== oldInputValue) {
        appendState.inputValue = inputValue;
      }

      if (!inputAmountB.isEqualTo(BN(oldInputAmountB))) {
        appendState.inputAmountB = inputAmountB;
      }

      this.setState(appendState);
    }

  };

  recalcEthTokenForm = () => {
    const {
      exchangeAddresses: { fromToken },
      selectors,
    } = this.props;

    const {
      inputValue: oldInputValue,
      outputValue: oldOutputValue,
      inputCurrency,
      outputCurrency,
      lastEditedField,
      exchangeRate: oldExchangeRate,
    } = this.state;

    const tokenAddress = [inputCurrency, outputCurrency].filter(currency => currency !== 'ETH')[0];
    const exchangeAddress = fromToken[tokenAddress];
    if (!exchangeAddress) {
      return;
    }
    const { value: inputReserve, decimals: inputDecimals } = selectors().getBalance(exchangeAddress, inputCurrency);
    const { value: outputReserve, decimals: outputDecimals } = selectors().getBalance(exchangeAddress, outputCurrency);

    if (lastEditedField === INPUT) {
      if (!oldInputValue) {
        return this.setState({
          outputValue: '',
          exchangeRate: BN(0),
        });
      }

      const inputAmount = BN(oldInputValue).multipliedBy(10 ** inputDecimals);
      const outputAmount = calculateEtherTokenOutput({ inputAmount, inputReserve, outputReserve });
      const outputValue = outputAmount.dividedBy(BN(10 ** outputDecimals)).toFixed(7);
      const exchangeRate = BN(outputValue).dividedBy(BN(oldInputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (outputValue !== oldOutputValue) {
        appendState.outputValue = outputValue;
      }

      this.setState(appendState);
    } else if (lastEditedField === OUTPUT) {
      if (!oldOutputValue) {
        return this.setState({
          inputValue: '',
          exchangeRate: BN(0),
        });
      }

      const outputAmount = BN(oldOutputValue).multipliedBy(10 ** outputDecimals);
      const inputAmount = calculateEtherTokenInput({ outputAmount, inputReserve, outputReserve });
      const inputValue = inputAmount.isNegative()
        ? 'N/A'
        : inputAmount.dividedBy(BN(10 ** inputDecimals)).toFixed(7);
      const exchangeRate = BN(oldOutputValue).dividedBy(BN(inputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (inputValue !== oldInputValue) {
        appendState.inputValue = inputValue;
      }

      this.setState(appendState);
    }
  };

  updateInput = (amount, index = 0) => {
    const inputs = this.state.inputs
    inputs[index] = amount
    this.setState({
      inputs: amount
    }, this.recalcForm);
  };

  onRedeem = async () => {
    const {
      exchangeAddresses: { fromToken },
      account,
      web3,
      selectors,
      addPendingTx,
    } = this.props;
    const {
      inputCurrency,
      outputCurrency,
    } = this.state;
    const ALLOWED_SLIPPAGE = 0.025;
    const TOKEN_ALLOWED_SLIPPAGE = 0.04;

    const type = getRedeemType(inputCurrency, outputCurrency);
    const { decimals: inputDecimals } = selectors().getBalance(account, '0xc778417e063141139fce010982780140aa0cd5ab');
    const { decimals: outputDecimals } = selectors().getBalance(account, '0xc778417e063141139fce010982780140aa0cd5ab');
    const blockNumber = await promisify(web3, 'getBlockNumber');
    const block = await promisify(web3, 'getBlock', blockNumber);
    const deadline = block.timestamp + 300;

    const func = window.location.pathname.substring(1);
    const currentABI = BSKT_ABI.find((abi) => { return abi.name === func })
    const inputs = currentABI.inputs.map((input, index) => {

      if (input.type === 'address') {
        return this.state.inputs[index] || '0xf1e48f13768bd8114a530070b43257a63f24bb12'
      } else if (input.type === 'uint256') {
        return BN(this.state.inputs[index]).multipliedBy(10 ** 18).toFixed(0)
      } else if (input.type.slice(-2) === '[]') {
        return []
      } else {
        return []
      }
    })
    return new web3.eth.Contract(BSKT_ABI, '0xc778417e063141139fce010982780140aa0cd5ab')
      .methods[func].apply(this, inputs).send({
        from: account,
        value: 0,
      }, (err, data) => {
        if (!err) {
          addPendingTx(data);
          this.reset();
        }
      });
  }

  render() {
    const func = window.location.pathname.substring(1);
    const currentABI = BSKT_ABI.find((abi) => { return abi.name === func })

    const { selectors, account } = this.props;
    const {
      lastEditedField,
      inputCurrency,
      outputCurrency,
      inputValue,
      outputValue,
      recipient,
    } = this.state;
    const estimatedText = '(estimated)';

    const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, '0xc778417e063141139fce010982780140aa0cd5ab');
    const { inputError, outputError, isValid } = this.validate();

    return (
      <div className="redeem">
        <MediaQuery query="(max-device-width: 767px)">
          <Header />
        </MediaQuery>
        <div
          className={classnames('swap__content', {
            'swap--inactive': !this.props.isConnected,
          })}
        >
          <NavigationTabs
            className={classnames('header__navigation', {
              'header--inactive': !this.props.isConnected,
            })}
          />
          <h1>{currentABI.name}({currentABI.inputs.map((input) => { return input.type }).join(', ')})</h1>
          {currentABI.inputs.map((input, index) => {
            if (input.type == 'address') {
              return <AddressInputPanel
                title={input.name}
                value={this.state.inputs[index]}
                onChange={address => this.setState({ recipient: address })}
              />
            } else if (input.type == 'uint256') {
              return <CurrencyInputPanel
                title={input.name}
                description={lastEditedField === OUTPUT ? estimatedText : ''}
                extraText={inputCurrency
                  ? `Balance: ${inputBalance.dividedBy(BN(10 ** inputDecimals)).toFixed(4)}`
                  : ''
                }

                onValueChange={console.log}
                value={this.state.inputs[index]}
                errorMessage={inputError}
              />
            } else if (input.type == 'address[]') {
              return 'empty list'
            }
          })}

          {currentABI.stateMutability === 'payable' && <CurrencyInputPanel
            title={'send eth'}
            description={lastEditedField === OUTPUT ? estimatedText : ''}
            extraText={inputCurrency
              ? `Balance: ${inputBalance.dividedBy(BN(10 ** inputDecimals)).toFixed(4)}`
              : ''
            }

            onValueChange={this.updateInput}
            selectedTokenAddress={'ETH'}
            value={inputValue}
            errorMessage={inputError}
          />}
          <div className="swap__cta-container">
            <button
              className={classnames('swap__cta-btn', {
                'swap--inactive': !this.props.isConnected,
              })}
              disabled={!isValid}
              onClick={this.onRedeem}
            >
              Redeem ({func})
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  state => ({
    balances: state.web3connect.balances,
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    account: state.web3connect.account,
    web3: state.web3connect.web3,
    exchangeAddresses: state.addresses.exchangeAddresses,
  }),
  dispatch => ({
    selectors: () => dispatch(selectors()),
    addPendingTx: id => dispatch(addPendingTx(id)),
  }),
)(Redeem);

const b = text => <span className="swap__highlight-text">{text}</span>;

function calculateEtherTokenOutput({ inputAmount: rawInput, inputReserve: rawReserveIn, outputReserve: rawReserveOut }) {
  const inputAmount = BN(rawInput);
  const inputReserve = BN(rawReserveIn);
  const outputReserve = BN(rawReserveOut);

  if (inputAmount.isLessThan(BN(10 ** 9))) {
    console.warn(`inputAmount is only ${inputAmount.toFixed(0)}. Did you forget to multiply by 10 ** decimals?`);
  }

  const numerator = inputAmount.multipliedBy(outputReserve).multipliedBy(997);
  const denominator = inputReserve.multipliedBy(1000).plus(inputAmount.multipliedBy(997));

  return numerator.dividedBy(denominator);
}

function calculateEtherTokenInput({ outputAmount: rawOutput, inputReserve: rawReserveIn, outputReserve: rawReserveOut }) {
  const outputAmount = BN(rawOutput);
  const inputReserve = BN(rawReserveIn);
  const outputReserve = BN(rawReserveOut);

  if (outputAmount.isLessThan(BN(10 ** 9))) {
    console.warn(`inputAmount is only ${outputAmount.toFixed(0)}. Did you forget to multiply by 10 ** decimals?`);
  }

  const numerator = outputAmount.multipliedBy(inputReserve).multipliedBy(1000);
  const denominator = outputReserve.minus(outputAmount).multipliedBy(997);
  return numerator.dividedBy(denominator.plus(1));
}

function getRedeemType(inputCurrency, outputCurrency) {
  if (!inputCurrency || !outputCurrency) {
    return;
  }

  if (inputCurrency === outputCurrency) {
    return;
  }

  if (inputCurrency !== 'ETH' && outputCurrency !== 'ETH') {
    return 'TOKEN_TO_TOKEN'
  }

  if (inputCurrency === 'ETH') {
    return 'ETH_TO_TOKEN';
  }

  if (outputCurrency === 'ETH') {
    return 'TOKEN_TO_ETH';
  }

  return;
}
