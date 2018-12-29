import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import ReactGA from 'react-ga';
import App from './pages/App';
import store from './store';

import './index.scss';

import { Exchange } from './ducks/uniswap'


let exchange = new Exchange({ ethReserve: 100, tokenReserve: 10 })

let exchange2 = new Exchange({ tokenAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2' })
let exchange3 = new Exchange({ exchangeAddress: '0x2C4Bd064b998838076fa341A83d007FC2FA50957' })
let exchange4 = new Exchange({ symbol: 'MKR' })

console.log(exchange2);

console.log(exchange3);

exchange3.syncBalancesWithLogs();

console.log(exchange3);
// console.log(exchange);
const trade5 = exchange.addLiquidity(100);

const ethValue = 1
const price = exchange.neutralPrice();
const tokenValue = (exchange.getInputPrice(ethValue))
console.log(ethValue / tokenValue * price - 1)


// console.log(exchange.change(10))
exchange.getInputPrice(10)
exchange.removeLiquidity(10)
exchange.removeLiquidity(10)
exchange.getInputPrice(10)
exchange.removeLiquidity(10)
exchange.getInputPrice(10)
exchange.removeLiquidity(10)
exchange.getInputPrice(10)
exchange.removeLiquidity(10)
exchange.getInputPrice(10)
exchange.removeLiquidity(10)

exchange.ethToTokenOutput(10)
exchange.ethToTokenInput(10)
exchange.removeLiquidity(10)
exchange.removeLiquidity(10)

exchange.removeLiquidity(10)

exchange.getInputPrice(10)
// console.log(exchange)
// console.log(trade5)


if (process.env.NODE_ENV === 'development') {
  // ReactGA.initialize('UA-128182339-02');
} else {
  ReactGA.initialize('UA-128182339-1');
}
ReactGA.pageview(window.location.pathname + window.location.search);

window.addEventListener('load', function () {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>
    , document.getElementById('root')
  );
});

