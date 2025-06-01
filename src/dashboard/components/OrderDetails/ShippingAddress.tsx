// components/OrderDetails/ShippingAddress.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import { getCountryName } from '../../utils/country-mapper';
import type { Order, ShippingAddress as ShippingAddressType } from '../../types/Order';

interface ShippingAddressProps {
  order: Order;
}

const getShippingAddress = (order: Order): ShippingAddressType | null => {
  if (order.shippingAddress) return order.shippingAddress;
  if (order.rawOrder?.recipientInfo?.address) return order.rawOrder.recipientInfo.address;
  if (order.recipientInfo?.address) return order.recipientInfo.address;
  if (order.billingInfo?.address) return order.billingInfo.address;
  return null;
};

export const ShippingAddress: React.FC<ShippingAddressProps> = ({ order }) => {
  const orderController = useOrderController();
  const shippingAddress = getShippingAddress(order);

  if (!shippingAddress) {
    return (
      <Box gap="8px" direction="vertical">
        <Text size="small" className="section-title">Shipping Address:</Text>
        <Text size="small" secondary>No shipping address available</Text>
      </Box>
    );
  }

  return (
    <Box gap="8px" direction="vertical">
      <Text size="small" className="section-title">Shipping Address:</Text>

      {/* Street Name and Number */}
      {(shippingAddress.streetAddress?.name || shippingAddress.streetAddress?.number) && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => {
            const streetAddress = `${shippingAddress.streetAddress?.name || ''} ${shippingAddress.streetAddress?.number || ''}`.trim();
            orderController.copyToClipboard(streetAddress, 'Street Address');
          }}
        >
          {`${shippingAddress.streetAddress?.name || ''} ${shippingAddress.streetAddress?.number || ''}`.trim()}
        </Text>
      )}

      {/* Apartment/Unit Number */}
      {shippingAddress.streetAddress?.apt && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => orderController.copyToClipboard(shippingAddress.streetAddress!.apt, 'Apartment/Unit')}
        >
          {shippingAddress.streetAddress.apt}
        </Text>
      )}

      {/* Fallback to addressLine1/addressLine2 for older structure */}
      {!shippingAddress.streetAddress?.name && shippingAddress.addressLine1 && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => orderController.copyToClipboard(shippingAddress.addressLine1, 'Street Address')}
        >
          {shippingAddress.addressLine1}
        </Text>
      )}

      {shippingAddress.addressLine2 && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => orderController.copyToClipboard(shippingAddress.addressLine2, 'Address Line 2')}
        >
          {shippingAddress.addressLine2}
        </Text>
      )}

      {/* City and Postal Code */}
      {(shippingAddress.city || shippingAddress.postalCode) && (
        <Box direction="horizontal" gap="8px" align="left">
          {shippingAddress.postalCode && (
            <Text
              size="small"
              className="clickable-info"
              onClick={() => orderController.copyToClipboard(shippingAddress.postalCode, 'Postal Code')}
            >
              {shippingAddress.postalCode}
            </Text>
          )}

          {shippingAddress.city && (
            <Text
              size="small"
              className="clickable-info"
              onClick={() => orderController.copyToClipboard(shippingAddress.city, 'City')}
            >
              {shippingAddress.city}
            </Text>
          )}
        </Box>
      )}

      {/* State/Province */}
      {(shippingAddress.subdivision || shippingAddress.subdivisionFullname) && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => {
            const subdivision = shippingAddress.subdivisionFullname || shippingAddress.subdivision;
            orderController.copyToClipboard(subdivision, 'State/Province');
          }}
        >
          {shippingAddress.subdivisionFullname || shippingAddress.subdivision}
        </Text>
      )}

      {/* Country */}
      {shippingAddress.country && (
        <Text
          size="small"
          className="clickable-info"
          onClick={() => {
            const countryName = shippingAddress.countryFullname || getCountryName(shippingAddress.country);
            orderController.copyToClipboard(countryName, 'Country');
          }}
        >
          {shippingAddress.countryFullname || getCountryName(shippingAddress.country)}
        </Text>
      )}
    </Box>
  );
};