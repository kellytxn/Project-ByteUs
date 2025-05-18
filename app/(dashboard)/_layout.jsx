import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import UserOnly from '../../components/auth/UserOnly'

export default function DashboardLayout() {
  return (
    <UserOnly>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#7B7878', paddingTop: 10, height: 90 },
        tabBarActiveTintColor: '#DFB6CF',
        tabBarInactiveTintColor: '#FFF',
        }}>

      <Tabs.Screen 
        name='timetable'
        options={{ title: 'Timetable generator', tabBarIcon: ({ focused }) => (
            <Ionicons
            size={24}
            name='calendar'
            color={focused ? '#DFB6CF' : '#FFF'}
            />
        )}} 
      />

      <Tabs.Screen 
        name='home'
        options={{ title: 'Home', tabBarIcon: ({ focused }) => (
            <Ionicons
            size={24}
            name='home'
            color={focused ? '#DFB6CF' : '#FFF'}
            />
        ) }} 
      />

      <Tabs.Screen 
        name='track'
        options={{ title: 'Graduation progress tracker', tabBarIcon: ({ focused }) => (
            <Ionicons
            size={24}
            name='stats-chart'
            color={focused ? '#DFB6CF' : '#FFF'}
            />
        ) }} 
      />
    </Tabs>
    </UserOnly>
  )
}