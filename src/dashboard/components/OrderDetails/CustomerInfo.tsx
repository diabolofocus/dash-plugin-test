// components/OrderDetails/CustomerInfo.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import type { Order } from '../../types/Order';

interface CustomerInfoProps {
    order: Order;
}

export const CustomerInfo: React.FC<CustomerInfoProps> = ({ order }) => {
    const orderController = useOrderController();

    // Safely extract contact details with fallbacks
    const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
    const billingContact = order.rawOrder?.billingInfo?.contactDetails;

    // Get customer name - use fallback from order.customer if rawOrder data is missing
    const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
    const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
    const fullName = `${firstName} ${lastName}`;

    // Get phone - try multiple sources
    const phone = recipientContact?.phone || billingContact?.phone || order.customer.phone || ''; //No phone provided

    // Get company - try multiple sources
    const company = recipientContact?.company || billingContact?.company || order.customer.company || ''; // No company provided

    // Email should be available from order.customer
    const email = order.customer.email || 'No email provided';

    return (
        <Box gap="8px" direction="vertical">
            <Text size="small" className="section-title">Contact Details:</Text>

            <Text
                size="medium"
                className="clickable-info"
                onClick={() => orderController.copyToClipboard(fullName, 'Name')}
            >
                {fullName}
            </Text>

            <Text
                size="small"
                className="clickable-info"
                onClick={() => orderController.copyToClipboard(email, 'Email')}
            >
                {email}
            </Text>

            <Text
                size="small"
                className="clickable-info"
                onClick={() => orderController.copyToClipboard(phone, 'Phone')}
            >
                {phone}
            </Text>

            <Text
                size="small"
                className="clickable-info"
                onClick={() => orderController.copyToClipboard(company, 'Company')}
            >
                {company}
            </Text>
        </Box>
    );
};