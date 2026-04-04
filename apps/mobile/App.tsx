import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { formatDisplayNumber } from '@eazque/shared';

export default function App() {
  const testNumber = formatDisplayNumber(1);
  return (
    <View style={styles.container}>
      <Text>eazque — {testNumber}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
