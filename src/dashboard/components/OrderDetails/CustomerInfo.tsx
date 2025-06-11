// components/OrderDetails/CustomerInfo.tsx
import React, { useState } from 'react';
import { Box, Text, TextButton, Avatar, Tooltip } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import { dashboard } from '@wix/dashboard';
import { contacts } from '@wix/crm';
import type { Order } from '../../types/Order';

interface CustomerInfoProps {
    order: Order;
}

export const CustomerInfo: React.FC<CustomerInfoProps> = ({ order }) => {
    const orderController = useOrderController();
    const [isNavigating, setIsNavigating] = useState(false);

    // Safely extract contact details with fallbacks
    const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
    const billingContact = order.rawOrder?.billingInfo?.contactDetails;

    // Get customer name - use fallback from order.customer if rawOrder data is missing
    const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
    const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
    const fullName = `${firstName} ${lastName}`;

    // Get phone - try multiple sources, only if it exists
    const phone = recipientContact?.phone || billingContact?.phone || order.customer.phone;

    // Get company - try multiple sources, only if it exists
    const company = recipientContact?.company || billingContact?.company || order.customer.company;

    // Email should be available from order.customer
    const email = order.customer.email || 'No email provided';

    const handleContactPageNavigation = async () => {
        if (!email || email === 'No email provided') {
            console.warn('No email available to search for contact');
            return;
        }

        try {
            setIsNavigating(true);
            console.log(`Searching for contact with email: ${email}`);

            // Step 1: Query contact by email to get contact ID
            const queryResult = await contacts.queryContacts()
                .eq('primaryInfo.email', email)
                .limit(1)
                .find();

            if (queryResult.items && queryResult.items.length > 0) {
                const contactId = queryResult.items[0]._id;
                console.log(`Found contact ID: ${contactId}`);

                // Step 2: Navigate to specific contact view page
                // URL pattern: /contacts/view/{contactId}
                dashboard.navigate({
                    pageId: "bdd09dca-7cc9-4524-81d7-c9336071b33e", // Contacts List page
                    relativeUrl: `/view/${contactId}`
                });
            } else {
                console.warn(`No contact found with email: ${email}`);

                // Fallback: Navigate to contacts list with search
                dashboard.navigate({
                    pageId: "bdd09dca-7cc9-4524-81d7-c9336071b33e", // Contacts List page
                    relativeUrl: `?search=${encodeURIComponent(email)}`
                });
            }

        } catch (error) {
            console.error('Failed to find contact or navigate:', error);

            // Fallback: Copy email to clipboard for manual search
            orderController.copyToClipboard(email, 'Contact Email');
            alert(`Contact lookup failed. Email "${email}" copied to clipboard. You can search for this contact manually in the Contacts page.`);
        } finally {
            setIsNavigating(false);
        }
    };

    return (
        <Box gap="6px" direction="vertical">
            <Text size="small" className="section-title">Contact Info:</Text>

            {/* Customer Name with Avatar and TextButton with Tooltip */}
            <Box direction="horizontal" align="left" verticalAlign="middle" gap="8px">
                {/* Profile Avatar */}
                <Avatar
                    size="size30"
                    name={fullName}
                // If you have contact profile image URL, you can add it here:
                // imgProps={{ src: contactImageUrl }}
                />

                {/* Customer Name as TextButton with Tooltip */}
                <Tooltip content="View Contact">
                    <TextButton
                        size="medium"
                        underline="onHover"
                        onClick={handleContactPageNavigation}
                        disabled={isNavigating || !email || email === 'No email provided'}
                        ellipsis
                        style={{
                            textAlign: 'left',
                            justifyContent: 'flex-start',
                            padding: 0,
                            minHeight: 'auto',
                            fontWeight: 'normal',
                            maxWidth: '200px' // Ensure ellipsis works properly
                        }}
                    >
                        {isNavigating ? 'Opening contact...' : fullName}
                    </TextButton>
                </Tooltip>
            </Box>

            <Text
                size="small"
                className="clickable-info"
                onClick={() => orderController.copyToClipboard(email, 'Email')}
            >
                {email}
            </Text>

            {/* Only render phone if it exists and is not empty */}
            {phone && phone.trim() && (
                <Text
                    size="small"
                    className="clickable-info"
                    onClick={() => orderController.copyToClipboard(phone, 'Phone')}
                >
                    {phone}
                </Text>
            )}

            {/* Only render company if it exists and is not empty */}
            {company && company.trim() && (
                <Text
                    size="small"
                    className="clickable-info"
                    onClick={() => orderController.copyToClipboard(company, 'Company')}
                >
                    {company}
                </Text>
            )}
        </Box>
    );
};