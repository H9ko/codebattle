defmodule CodebattleWeb.ChatChannelTest do
  use CodebattleWeb.ChannelCase, async: true

  alias CodebattleWeb.ChatChannel
  alias Codebattle.Chat.Server
  alias CodebattleWeb.UserSocket
  alias Codebattle.GameProcess.Player

  setup do
    user1 = insert(:user)
    user2 = insert(:user)

    user_token1 = Phoenix.Token.sign(socket(UserSocket), "user_token", user1.id)
    {:ok, socket1} = connect(UserSocket, %{"token" => user_token1})

    user_token2 = Phoenix.Token.sign(socket(UserSocket), "user_token", user2.id)
    {:ok, socket2} = connect(UserSocket, %{"token" => user_token2})

    state = :playing

    data = %{players: [Player.build(user1), Player.build(user2)]}

    game = setup_game(state, data)

    {:ok, %{user1: user1, user2: user2, socket1: socket1, socket2: socket2, id: game.id}}
  end

  test "sends chat info when user join", %{user1: user1, socket1: socket1, id: id} do
    Server.start_link(id)
    chat_topic = "chat:" <> to_string(id)

    {:ok, response, _socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)

    assert Poison.encode(response) ==
             Poison.encode(%{
               users: [user1],
               messages: []
             })
  end

  test "broadcasts user:joined with state after user join", %{
    user2: user2,
    socket2: socket2,
    id: id
  } do
    Server.start_link(id)
    chat_topic = "chat:" <> to_string(id)
    {:ok, _response, _socket2} = subscribe_and_join(socket2, ChatChannel, chat_topic)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^chat_topic,
      event: "user:joined",
      payload: response
    }

    assert Poison.encode(response) ==
             Poison.encode(%{
               users: [user2]
             })
  end

  test "messaging process", %{user1: user1, socket1: socket1, socket2: socket2, id: id} do
    Server.start_link(id)
    chat_topic = "chat:" <> to_string(id)
    {:ok, _response, socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)

    message = "test message"

    push(socket1, "new:message", %{message: message})

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^chat_topic,
      event: "new:message",
      payload: response
    }

    assert Poison.encode(response) == Poison.encode(%{user: user1.name, message: message})

    {:ok, %{users: users, messages: messages}, _socket2} =
      subscribe_and_join(socket2, ChatChannel, chat_topic)

    assert length(users) == 2
    assert [%{user: user1.name, message: message}] == messages
  end

  @tag :skip
  # TODO: fix test
  test "removes user from list on leaving channel", %{socket1: socket1, socket2: socket2, id: id} do
    Server.start_link(id)
    chat_topic = "chat:" <> to_string(id)

    {:ok, _response, _socket1} = subscribe_and_join(socket1, ChatChannel, chat_topic)
    {:ok, response, socket2} = subscribe_and_join(socket2, ChatChannel, chat_topic)

    %{users: users} = response

    assert length(users) == 2

    leave(socket2)
    :timer.sleep(100)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^chat_topic,
      event: "user:left",
      payload: response
    }

    %{users: users} = response

    assert length(users) == 1
  end
end
