import GuestOnly from "../../components/auth/GuestOnly";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <GuestOnly>
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </GuestOnly>
  );
}
