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

export const ComponentsVisibility: React.FC = observer(() => {

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
                        <Icons.Visible />
                        <Heading size="medium">Components Visibility</Heading>


                    </Box>
                }
                subtitle="Manage the visibility of components in your dashboard"
            />
            <Card.Divider />
            <Card.Content>
                <Box direction="vertical">
                    {renderListItem({
                        title: 'Total Products Weight',
                        subtitle: 'The sum of all items weight',
                        padding: '0px 0px 18px',
                        toggleChecked: true,
                        disabled: true,
                    })}
                    <Divider />


                    {renderListItem({
                        title: 'Products SKU',
                        subtitle: 'Show the SKU of products if you use them',
                        padding: '18px 0px 18px',
                        toggleChecked: true,
                        disabled: true,
                    })}

                </Box>
            </Card.Content>
        </Card>
    );
});