import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { dismissBetaMessage } from '../../ducks/app';
import { Tab, Tabs } from "../Tab";
import BSKT_ABI from '../../abi/exchange';

import './beta-message.scss';

class NavigationTabs extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }),
    className: PropTypes.string,
    dismissBetaMessage: PropTypes.func.isRequired,
    showBetaMessage: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedPath: this.props.location.pathname,
      className: '',
      showWarning: true,
    };
  }

  renderTab(name, path, regex) {
    const { push } = this.props.history;
    return (
      <Tab
        text={name}
        onClick={() => push(path)}
        isSelected={regex.test(this.props.location.pathname)}
      />
    )
  }

  render() {
    const { showBetaMessage, className, dismissBetaMessage } = this.props;
    return (
      <div>
        <Tabs className={className}>
          {BSKT_ABI.filter((abi) => { return abi.type == 'function' && !abi.constant }).map((abi) => {
            return this.renderTab(abi.name, '/0xc778417e063141139fce010982780140aa0cd5ab/' + abi.name, /t/)
          })}
        </Tabs>
        {
          showBetaMessage && (
            <div className="beta-message" onClick={dismissBetaMessage}>
              💀 This project is in beta. Use at your own risk.
            </div>
          )
        }
      </div>
    );
  }
}

export default withRouter(
  connect(
    state => ({
      showBetaMessage: state.app.showBetaMessage,
    }),
    dispatch => ({
      dismissBetaMessage: () => dispatch(dismissBetaMessage()),
    }),
  )(NavigationTabs)
);
