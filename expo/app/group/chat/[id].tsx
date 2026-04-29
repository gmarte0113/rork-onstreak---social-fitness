import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { useChatRead } from "@/providers/ChatReadProvider";
import AppBackground from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ScreenHeader";

function formatTime(ts: number): string {
  try {
    const d = new Date(ts);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy} ${time}`;
  } catch {
    return "";
  }
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, sendMessage } = useApp();
  const group = useMemo(
    () => state.groups.find((g) => g.id === id),
    [state.groups, id]
  );
  const [text, setText] = useState<string>("");
  const listRef = useRef<FlatList<(typeof state.messages)[number]>>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const { markSeen } = useChatRead();

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.groupId === id)
        .sort((a, b) => a.createdAt - b.createdAt),
    [state.messages, id]
  );

  useEffect(() => {
    if (messages.length > 0 && isNearBottomRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  useEffect(() => {
    if (id) markSeen(id, Date.now());
  }, [id, markSeen, messages.length]);

  if (!group) {
    return (
      <View style={styles.safe}>
        <AppBackground />
        <ScreenHeader title="Chat" variant="bar" />
        <Text style={styles.missing}>Group not found.</Text>
      </View>
    );
  }

  const onSend = () => {
    if (!text.trim()) return;
    sendMessage(group.id, text);
    setText("");
  };

  return (
    <View style={styles.safe}>
      <AppBackground />
      <ScreenHeader title={group.name} variant="bar" />
      <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Be the first to say hi.</Text>
          <Text style={styles.emptySub}>
            Keep the crew motivated. One message a day goes a long way.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - (contentOffset.y + layoutMeasurement.height);
            isNearBottomRef.current = distanceFromBottom < 120;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
          renderItem={({ item }) => {
            const isSelf = item.authorId === state.userId;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  isSelf ? styles.bubbleRowRight : styles.bubbleRowLeft,
                ]}
              >
                <View style={styles.bubbleColumn}>
                  <View
                    style={[
                      styles.bubble,
                      isSelf ? styles.bubbleSelf : styles.bubbleOther,
                    ]}
                  >
                    {!isSelf && (
                      <Text style={styles.bubbleAuthor}>{item.authorName}</Text>
                    )}
                    <Text
                      style={[
                        styles.bubbleText,
                        isSelf && { color: Colors.text },
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.timestamp,
                      isSelf ? styles.timestampRight : styles.timestampLeft,
                    ]}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Say something…"
          placeholderTextColor={Colors.textDim}
          multiline
          testID="chat-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!text.trim()}
          testID="chat-send"
        >
          <Send color={Colors.text} size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  kav: { flex: 1 },
  missing: { color: Colors.textMuted, padding: 40, textAlign: "center" },
  list: { padding: 16, gap: 8 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 19,
  },
  bubbleRow: { flexDirection: "row" },
  bubbleColumn: { maxWidth: "78%" },
  timestamp: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 3,
    opacity: 0.6,
  },
  timestampLeft: { textAlign: "left", marginLeft: 6 },
  timestampRight: { textAlign: "right", marginRight: 6 },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSelf: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleAuthor: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 19 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
