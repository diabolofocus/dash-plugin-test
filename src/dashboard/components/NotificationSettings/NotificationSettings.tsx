// components/NotificationSettings/NotificationSettings.tsx - UPDATED WITH TOGGLE
import React from 'react';
import { observer } from 'mobx-react-lite';
import {
    Card,
    Box,
    Text,
    Button,
    Heading,
    ToggleSwitch,
    Divider
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useOrderController } from '../../hooks/useOrderController';

export const NotificationSettings: React.FC = observer(() => {
    const orderController = useOrderController();

    const handleTestSound = () => {
        try {
            orderController.testNotifications();
        } catch (error) {
            // Test sound failed
        }
    };

    const status = orderController.getRealtimeStatus();

    const renderListItem = ({ title, subtitle, padding, toggleChecked, disabled = false }) => {
        return (
            <Box verticalAlign="middle" align="space-between" padding={padding}>
                <Box direction="vertical">
                    <Text weight="normal">{title}</Text>
                    <Text secondary size="small">
                        {subtitle}
                    </Text>
                </Box>
                <ToggleSwitch checked={toggleChecked} disabled={disabled} />
            </Box>
        );
    };

    return (
        <Card >
            <Card.Header
                title={
                    <Box direction="horizontal" align="left" gap="8px">
                        <Icons.Notification />
                        <Heading size="medium">Real-time Notifications</Heading>


                    </Box>
                }
                subtitle="Automatic detection and alerts for new orders."
            />
            <Card.Divider />
            <Card.Content>
                <Box direction="vertical">
                    {renderListItem({
                        title: 'Automatic Detection',
                        subtitle: 'Checks for new orders in real time every 15 seconds.',
                        padding: '0px 0px 18px',
                        toggleChecked: true,
                        disabled: true,
                    })}
                    <Divider />


                    {renderListItem({
                        title: 'Sound Alert',
                        subtitle: 'Plays a notification sound when new orders arrive.',
                        padding: '18px 0px 18px',
                        toggleChecked: true,
                        disabled: true,
                    })}

                    <Box paddingTop="24px" align="left">
                        <Button
                            onClick={handleTestSound}
                            prefixIcon={<Icons.Play />}
                            skin="standard"
                            size="tiny"
                        >
                            Test Sound
                        </Button>
                    </Box>
                </Box>
            </Card.Content>
        </Card>
    );
});