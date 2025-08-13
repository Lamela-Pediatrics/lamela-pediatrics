import { Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Chrome as Home, Users, Calendar, MessageCircle, ChartBar as BarChart3, Settings, Baby, Stethoscope, ClipboardList } from 'lucide-react-native';

export default function TabLayout() {
  const { user } = useAuth();

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { name: 'index', title: 'Dashboard', icon: Home },
          { name: 'patients', title: 'Patients', icon: Baby },
          { name: 'staff', title: 'Staff', icon: Users },
          { name: 'appointments', title: 'Appointments', icon: Calendar },
          { name: 'reports', title: 'Reports', icon: BarChart3 },
          { name: 'settings', title: 'Settings', icon: Settings },
        ];
      case 'doctor':
        return [
          { name: 'index', title: 'Dashboard', icon: Home },
          { name: 'patients', title: 'My Patients', icon: Baby },
          { name: 'appointments', title: 'Schedule', icon: Calendar },
          { name: 'messages', title: 'Messages', icon: MessageCircle },
          { name: 'reports', title: 'Reports', icon: BarChart3 },
        ];
      case 'staff':
        return [
          { name: 'index', title: 'Dashboard', icon: Home },
          { name: 'patients', title: 'Patients', icon: Baby },
          { name: 'appointments', title: 'Appointments', icon: Calendar },
          { name: 'tasks', title: 'Tasks', icon: ClipboardList },
        ];
      case 'parent':
      default:
        return [
          { name: 'index', title: 'Home', icon: Home },
          { name: 'babies', title: 'My Babies', icon: Baby },
          { name: 'appointments', title: 'Appointments', icon: Calendar },
          { name: 'messages', title: 'Messages', icon: MessageCircle },
          { name: 'growth', title: 'Growth', icon: BarChart3 },
        ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ size, color }) => (
              <tab.icon size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}