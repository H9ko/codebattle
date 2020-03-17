import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { Emoji } from 'emoji-mart';
import sanitizeHtml from 'sanitize-html';
import { fetchState, addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserName from '../components/UserName';
import EmojiPicker from '../components/EmojiPicker';
import EmojiToolTip from '../components/ EmojiTooltip';
import ChatInput from '../components/ChatInput';
import GameStatusCodes from '../config/gameStatusCodes';
import 'emoji-mart/css/emoji-mart.css';

const sanitizeConf = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'img'],
  allowedAttributes: { a: ['href'], img: ['src', 'style'] },
};

class ChatWidget extends React.Component {
  state = { message: '', isEmojiPickerVisible: false, isEmojiTooltipVisible: false };

  componentDidMount() {
    const { dispatch, isStoredGame } = this.props;
    if (!isStoredGame) {
      dispatch(fetchState());
    }
  }

  handleChange = e => {
    const isEmojiTooltipVisible = /.*:[a-zA-Z]{1,}([^ ])+$/.test(e.target.value);
    this.setState({ message: e.target.value, isEmojiTooltipVisible });
  };

  handleSubmit = e => {
    e.preventDefault();
    const { message } = this.state;
    const {
      currentUser: { name },
    } = this.props;

    if (message) {
      addMessage(name, sanitizeHtml(message, sanitizeConf));
      this.setState({ message: '' });
    }
  };

  toggleEmojiPickerVisibility = () => {
    const { isEmojiPickerVisible } = this.state;
    this.setState({ isEmojiPickerVisible: !isEmojiPickerVisible });
  };

  hideEmojiPicker = () => {
    this.setState({ isEmojiPickerVisible: false });
  };

  // sanitize = () => {
  //   const { message } = this.state;
  //   this.setState({ message: sanitizeHtml(message, sanitizeConf) })
  // };

  // handleSelectEmodji = (colons = null) => emoji => {
  //   const { message } = this.state;
  //   const messageWithoutColons = colons ? message.slice(0, -colons.length - 2) : message;
  //   this.setState({
  //     message: `${messageWithoutColons}${emoji.native}`,
  //     isEmojiPickerVisible: false,
  //   });
  // };

  handleSelectEmodji = emoji => {
    const { message } = this.state;
    const image = `<img src="${emoji.imageUrl}" style="; width: 16px; height: 19px" />`;
    const newMessage = `${message}${image}`;
    this.setState(() => ({ message: newMessage, isEmojiPickerVisible: false }));
  }

  handleInputKeydown = e => {
    const { isEmojiTooltipVisible } = this.state;
    if (e.key === 'Enter' && isEmojiTooltipVisible) {
      e.preventDefault();
    }
  }

  hideEmojiTooltip = () => this.setState({ isEmojiTooltipVisible: false });

  renderChatInput() {
    const { message, isEmojiPickerVisible, isEmojiTooltipVisible } = this.state;

    return (
      <form
        className="p-2 input-group input-group-sm position-absolute"
        style={{ bottom: 0 }}
        onSubmit={this.handleSubmit}
      >
        <ChatInput
          message={message}
          onChange={this.handleChange}
          onKeydown={this.handleInputKeydown}
        />
        <button
          type="button"
          className="btn btn-link position-absolute"
          style={{ right: '50px', zIndex: 5 }}
          onClick={this.toggleEmojiPickerVisibility}
        >
          <Emoji emoji="grinning" set="apple" size={20} />
        </button>
        {isEmojiTooltipVisible && (
          <EmojiToolTip
            message={message}
            handleSelect={this.handleSelectEmodji}
            hide={this.hideEmojiTooltip}
          />
        )}
        {isEmojiPickerVisible && (
          <EmojiPicker
            handleSelect={this.handleSelectEmodji}
            hideEmojiPicker={this.hideEmojiPicker}
            isShown={isEmojiPickerVisible}
          />
        )}
        <div className="input-group-append">
          <button className="btn btn-outline-secondary" type="button" onClick={this.handleSubmit}>
            Send
          </button>
        </div>
      </form>
    );
  }

  render() {
    const { messages, users, isStoredGame } = this.props;
    const listOfUsers = _.uniqBy(users, 'id');

    return (
      <div className="d-flex shadow-sm h-100">
        <div className="col-12 col-sm-8 p-0 bg-white rounded-left h-100 position-relative">
          <Messages messages={messages} />
          {!isStoredGame && this.renderChatInput()}
        </div>
        <div className="col-4 d-none d-sm-block p-0 border-left bg-white rounded-right">
          <div className="d-flex flex-direction-column flex-wrap justify-content-between">
            <div className="px-3 pt-3 pb-2 w-100">
              <p className="mb-1">{`Online users: ${users.length}`}</p>
              <div className="overflow-auto" style={{ height: '175px' }}>
                {listOfUsers.map(user => (
                  <div key={user.id} className="my-2">
                    <UserName user={user} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  users: selectors.chatUsersSelector(state),
  messages: selectors.chatMessagesSelector(state),
  currentUser: selectors.currentChatUserSelector(state),
  isStoredGame: selectors.gameStatusSelector(state).status === GameStatusCodes.stored,
});

export default connect(mapStateToProps, null)(ChatWidget);
