import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// Catches render-time JS errors so the user sees the message instead of a
// blank black screen (and can report it back for diagnosis).
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.log("[AuraControl] Render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>Erreur au démarrage</Text>
          <Text style={styles.message}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          {this.state.error?.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0C" },
  content: { padding: 24, paddingTop: 80 },
  title: { color: "#EF4444", fontSize: 20, fontWeight: "700", marginBottom: 14 },
  message: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  stack: { color: "#8E8E98", fontSize: 11, lineHeight: 16, marginTop: 16 },
});
