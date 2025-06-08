// components/OrderDetails/BillingInfo.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import { getCountryName } from '../../utils/country-mapper';
import type { Order } from '../../types/Order';

interface BillingInfoProps {
    order: Order;
}

const getBillingInfo = (order: Order) => {
    // Try to get billing info from different possible locations
    if (order.billingInfo) return order.billingInfo;
    if (order.rawOrder?.billingInfo) return order.rawOrder.billingInfo;
    return null;
};

export const BillingInfo: React.FC<BillingInfoProps> = ({ order }) => {
    const orderController = useOrderController();
    const billingInfo = getBillingInfo(order);

    if (!billingInfo) {
        return (
            <Box gap="8px" direction="vertical">
                <Text size="small" className="section-title">Billing Information:</Text>
                <Text size="small" secondary>No billing information available</Text>
            </Box>
        );
    }

    const address = billingInfo.address;
    const contactDetails = billingInfo.contactDetails;

    return (
        <Box gap="8px" direction="vertical">
            <Text size="small" className="section-title">Billing Information:</Text>

            {/* Contact Details */}
            {contactDetails && (
                <Box gap="8px" direction="vertical">
                    {/* Name */}
                    {(contactDetails.firstName || contactDetails.lastName) && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => {
                                const fullName = `${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim();
                                orderController.copyToClipboard(fullName, 'Billing Name');
                            }}
                        >
                            {`${contactDetails.firstName || ''} ${contactDetails.lastName || ''}`.trim()}
                        </Text>
                    )}

                    {/* Company */}
                    {contactDetails.company && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(contactDetails.company, 'Billing Company')}
                        >
                            {contactDetails.company}
                        </Text>
                    )}

                    {/* Phone */}
                    {contactDetails.phone && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(contactDetails.phone, 'Billing Phone')}
                        >
                            {contactDetails.phone}
                        </Text>
                    )}

                    {/* VAT ID (for Brazil) */}
                    {contactDetails.vatId && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(contactDetails.vatId._id, 'VAT ID')}
                        >
                            VAT ID: {contactDetails.vatId._id} ({contactDetails.vatId.type})
                        </Text>
                    )}
                </Box>
            )}

            {/* Billing Address */}
            {address && (
                <Box gap="8px" direction="vertical">

                    {/* Street Name and Number */}
                    {(address.streetAddress?.name || address.streetAddress?.number) && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => {
                                const streetAddress = `${address.streetAddress?.name || ''} ${address.streetAddress?.number || ''}`.trim();
                                orderController.copyToClipboard(streetAddress, 'Billing Street Address');
                            }}
                        >
                            {`${address.streetAddress?.name || ''} ${address.streetAddress?.number || ''}`.trim()}
                        </Text>
                    )}

                    {/* Apartment/Unit Number */}
                    {address.streetAddress?.apt && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(address.streetAddress!.apt, 'Billing Apartment/Unit')}
                        >
                            {address.streetAddress.apt}
                        </Text>
                    )}

                    {/* Fallback to addressLine1/addressLine2 for older structure */}
                    {!address.streetAddress?.name && address.addressLine1 && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(address.addressLine1, 'Billing Street Address')}
                        >
                            {address.addressLine1}
                        </Text>
                    )}

                    {address.addressLine2 && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => orderController.copyToClipboard(address.addressLine2, 'Billing Address Line 2')}
                        >
                            {address.addressLine2}
                        </Text>
                    )}

                    {/* City and Postal Code */}
                    {(address.city || address.postalCode) && (
                        <Box direction="horizontal" gap="6px" align="left">
                            {address.postalCode && (
                                <Text
                                    size="small"
                                    className="clickable-info"
                                    onClick={() => orderController.copyToClipboard(address.postalCode, 'Billing Postal Code')}
                                >
                                    {address.postalCode}
                                </Text>
                            )}

                            {address.city && (
                                <Text
                                    size="small"
                                    className="clickable-info"
                                    onClick={() => orderController.copyToClipboard(address.city, 'Billing City')}
                                >
                                    {address.city}
                                </Text>
                            )}
                        </Box>
                    )}

                    {/* State/Province */}
                    {(address.subdivision || address.subdivisionFullname) && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => {
                                const subdivision = address.subdivisionFullname || address.subdivision;
                                orderController.copyToClipboard(subdivision, 'Billing State/Province');
                            }}
                        >
                            {address.subdivisionFullname || address.subdivision}
                        </Text>
                    )}

                    {/* Country */}
                    {address.country && (
                        <Text
                            size="small"
                            className="clickable-info"
                            onClick={() => {
                                const countryName = address.countryFullname || getCountryName(address.country);
                                orderController.copyToClipboard(countryName, 'Billing Country');
                            }}
                        >
                            {address.countryFullname || getCountryName(address.country)}
                        </Text>
                    )}
                </Box>
            )}
        </Box>
    );
};