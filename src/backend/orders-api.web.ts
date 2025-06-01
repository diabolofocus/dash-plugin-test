// src/backend/orders-api.web.ts
// Updated to use dynamic limit parameter instead of hardcoded 50

import { webMethod, Permissions } from '@wix/web-methods';

// Test function to check if we can access Wix orders with pagination support
export const testOrdersConnection = webMethod(
  Permissions.Anyone,
  async ({ limit = 50, cursor = '' }: { limit?: number; cursor?: string } = {}) => {
    try {
      try {
        const { orders } = await import('@wix/ecom');

        // Use searchOrders with proper cursor paging and dynamic limit
        const result = await orders.searchOrders({
          filter: {
            status: { "$ne": "INITIALIZED" } // Exclude orders with "INITIALIZED" status
          },
          cursorPaging: {
            limit: limit, // Use the requested limit (now dynamic, defaults to 24)
            cursor: cursor || undefined // Use the cursor if provided
          }
        });

        const parsedOrders = result.orders?.map((order: any) => {
          // Extract customer info directly from recipientInfo and billingInfo
          const recipientContact = order.recipientInfo?.contactDetails;
          const billingContact = order.billingInfo?.contactDetails;
          const buyerInfo = order.buyerInfo;

          // Get customer details - prioritize recipientInfo, then billingInfo, then buyerInfo
          const firstName = recipientContact?.firstName || billingContact?.firstName || 'Unknown';
          const lastName = recipientContact?.lastName || billingContact?.lastName || 'Customer';
          const phone = recipientContact?.phone || billingContact?.phone || '';
          const company = recipientContact?.company || billingContact?.company || '';
          const email = buyerInfo?.email || recipientContact?.email || billingContact?.email || 'no-email@example.com';

          // Extract shipping address - prioritize recipientInfo
          let shippingAddress = null;
          if (order.recipientInfo?.address) {
            const addr = order.recipientInfo.address;
            shippingAddress = {
              // New structure fields
              streetAddress: addr.streetAddress ? {
                name: addr.streetAddress.name || '',
                number: addr.streetAddress.number || '',
                apt: addr.streetAddress.apt || ''
              } : null,
              city: addr.city || '',
              postalCode: addr.postalCode || '',
              country: addr.country || '',
              countryFullname: addr.countryFullname || addr.country || '',
              subdivision: addr.subdivision || '',
              subdivisionFullname: addr.subdivisionFullname || '',
              // Legacy fields for fallback
              addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
              addressLine2: addr.addressLine2 || (addr.streetAddress?.apt || '')
            };
          } else if (order.billingInfo?.address) {
            const addr = order.billingInfo.address;
            shippingAddress = {
              // New structure fields
              streetAddress: addr.streetAddress ? {
                name: addr.streetAddress.name || '',
                number: addr.streetAddress.number || '',
                apt: addr.streetAddress.apt || ''
              } : null,
              city: addr.city || '',
              postalCode: addr.postalCode || '',
              country: addr.country || '',
              countryFullname: addr.countryFullname || addr.country || '',
              subdivision: addr.subdivision || '',
              subdivisionFullname: addr.subdivisionFullname || '',
              // Legacy fields for fallback
              addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
              addressLine2: addr.addressLine2 || (addr.streetAddress?.apt || '')
            };
          }

          // Process line items with image handling
          const processedItems = order.lineItems?.map((item: any) => {
            let imageUrl = '';

            if (item.image && typeof item.image === 'string') {
              if (item.image.startsWith('wix:image://v1/')) {
                const imageId = item.image
                  .replace('wix:image://v1/', '')
                  .split('#')[0]
                  .split('~')[0];
                imageUrl = `https://static.wixstatic.com/media/${imageId}`;
              } else if (item.image.startsWith('wix:image://')) {
                const imageId = item.image.replace(/^wix:image:\/\/[^\/]*\//, '').split('#')[0].split('~')[0];
                imageUrl = `https://static.wixstatic.com/media/${imageId}`;
              } else if (item.image.startsWith('http')) {
                imageUrl = item.image;
              } else {
                imageUrl = `https://static.wixstatic.com/media/${item.image}`;
              }
            }

            return {
              name: item.productName?.original || 'Unknown Product',
              quantity: item.quantity || 1,
              price: item.price?.formattedAmount || '$0.00',
              image: imageUrl,
              weight: item.physicalProperties?.weight || 0,
              options: item.catalogReference?.options || {}
            };
          }) || [];

          // In your backend/orders-api.web.ts - Fixed to use rawOrder fields
          // Find the section where you process order status and replace with this:

          // Status mapping - Use rawOrder fields as source of truth
          let orderStatus = 'UNKNOWN';

          // Get status fields from the right source
          const rawStatus = order.status; // Overall order status (CANCELED, APPROVED, etc.)
          const fulfillmentStatus = order.fulfillmentStatus; // This might be undefined!
          const rawOrderFulfillmentStatus = order.rawOrder?.fulfillmentStatus; // This has the real data!

          console.log(`🐛 Backend Status Debug - Order ${order.number}:`, {
            rawStatus,
            fulfillmentStatus,
            rawOrderFulfillmentStatus,
            orderNumber: order.number,
            usingRawOrder: !fulfillmentStatus && rawOrderFulfillmentStatus
          });

          // 🔥 FIXED PRIORITY LOGIC:
          // 1. If rawStatus is CANCELED -> use CANCELED
          // 2. Use fulfillmentStatus if available, otherwise use rawOrder.fulfillmentStatus
          // 3. Fallback to NOT_FULFILLED

          if (rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') {
            // CANCELED orders always show as canceled
            orderStatus = 'CANCELED';
            console.log(`✅ Backend: Order ${order.number} marked as CANCELED`);
          } else {
            // For non-canceled orders, get fulfillment status from the right source
            const actualFulfillmentStatus = fulfillmentStatus || rawOrderFulfillmentStatus || 'NOT_FULFILLED';
            orderStatus = actualFulfillmentStatus;
            console.log(`✅ Backend: Order ${order.number} using fulfillment status: ${actualFulfillmentStatus} (source: ${fulfillmentStatus ? 'fulfillmentStatus' : 'rawOrder.fulfillmentStatus'})`);
          }

          // Enhanced payment status mapping
          let paymentStatus = order.paymentStatus || 'UNKNOWN';
          if (order.paymentStatus === 'FULLY_REFUNDED') {
            paymentStatus = 'FULLY_REFUNDED';
          } else if (order.paymentStatus === 'PARTIALLY_REFUNDED') {
            paymentStatus = 'PARTIALLY_REFUNDED';
          }

          console.log(`🎯 Backend Final Status - Order ${order.number}:`, {
            finalOrderStatus: orderStatus,
            finalPaymentStatus: paymentStatus,
            wasFixed: !fulfillmentStatus && rawOrderFulfillmentStatus ? 'YES - used rawOrder.fulfillmentStatus' : 'NO - used direct fulfillmentStatus'
          });

          return {
            _id: order._id,
            number: order.number,
            _createdDate: order._createdDate,
            customer: {
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone,
              company: company
            },
            items: processedItems,
            totalWeight: order.lineItems?.reduce((total: number, item: any) => {
              const itemWeight = item.physicalProperties?.weight || 0;
              const quantity = item.quantity || 1;
              return total + (itemWeight * quantity);
            }, 0) || 0,
            total: order.priceSummary?.total?.formattedAmount || '$0.00',
            status: orderStatus, // ✅ Now uses rawOrder.fulfillmentStatus when needed
            paymentStatus: paymentStatus,
            shippingInfo: {
              carrierId: order.shippingInfo?.carrierId || '',
              title: order.shippingInfo?.title || 'No shipping method',
              cost: order.shippingInfo?.cost?.formattedAmount || '$0.00'
            },
            weightUnit: order.weightUnit || 'KG',
            shippingAddress: shippingAddress,
            billingInfo: order.billingInfo,
            recipientInfo: order.recipientInfo,
            rawOrder: order // ✅ Keep the raw order for debugging
          };


        }) || [];

        return {
          success: true,
          method: '@wix/ecom',
          orders: parsedOrders,
          orderCount: parsedOrders.length,
          pagination: {
            hasNext: result.metadata?.hasNext || false,
            nextCursor: result.metadata?.cursors?.next || '',
            prevCursor: result.metadata?.cursors?.prev || ''
          },
          message: `Successfully parsed ${parsedOrders.length} orders from your store with contact details! (Limit: ${limit})`
        };

      } catch (ecomError: unknown) {
        const ecomErrorMsg = ecomError instanceof Error ? ecomError.message : String(ecomError);

        return {
          success: false,
          error: 'eCommerce API not accessible',
          ecomError: ecomErrorMsg,
          message: 'Could not access @wix/ecom orders API or @wix/crm contacts API. Check permissions and app setup.'
        };
      }

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
        message: 'Failed to test orders connection'
      };
    }
  }
);

// Dynamic fulfillment function (unchanged)
export const fulfillOrderInWix = webMethod(
  Permissions.Anyone,
  async ({
    orderId,
    trackingNumber,
    shippingProvider,
    orderNumber
  }: {
    orderId: string;
    trackingNumber: string;
    shippingProvider: string;
    orderNumber: string;
  }) => {
    try {
      // Dynamic import without TypeScript checking
      const ecomModule = await import('@wix/ecom');
      const ordersAPI = ecomModule.orders;
      const fulfillmentAPI = ecomModule.orderFulfillments;

      const carrierMapping: any = {
        'dhl': 'dhl',
        'ups': 'ups',
        'fedex': 'fedex',
        'usps': 'usps'
      };

      const shippingCarrier = carrierMapping[shippingProvider.toLowerCase()] || shippingProvider.toLowerCase();

      // Get order details
      const orderDetails = await ordersAPI.getOrder(orderId);
      if (!orderDetails) {
        throw new Error(`Order ${orderNumber} not found`);
      }

      const fulfillmentStatus = String(orderDetails.fulfillmentStatus || '');

      if (fulfillmentStatus === 'FULFILLED') {
        try {
          // Try all possible methods dynamically without TypeScript checks
          const fulfillmentMethods = [
            'listFulfillmentsForSingleOrder',
            'listFulfillments',
            'getFulfillments',
            'queryFulfillments'
          ];

          let fulfillmentsData = null;
          let methodUsed = '';

          for (const methodName of fulfillmentMethods) {
            try {
              const method = (fulfillmentAPI as any)[methodName];

              if (typeof method === 'function') {
                if (methodName === 'listFulfillmentsForSingleOrder') {
                  fulfillmentsData = await method(orderId);
                  methodUsed = methodName;
                  break;
                } else if (methodName === 'listFulfillments') {
                  fulfillmentsData = await method({ orderId: orderId });
                  methodUsed = methodName;
                  break;
                } else if (methodName === 'getFulfillments') {
                  fulfillmentsData = await method(orderId);
                  methodUsed = methodName;
                  break;
                } else if (methodName === 'queryFulfillments') {
                  fulfillmentsData = await method({ filter: { orderId: { $eq: orderId } } });
                  methodUsed = methodName;
                  break;
                }
              }
            } catch (methodError) {
              continue;
            }
          }

          if (fulfillmentsData && methodUsed) {
            // Extract fulfillments from different response structures
            let fulfillments = null;
            if (fulfillmentsData.orderWithFulfillments?.fulfillments) {
              fulfillments = fulfillmentsData.orderWithFulfillments.fulfillments;
            } else if (fulfillmentsData.fulfillments) {
              fulfillments = fulfillmentsData.fulfillments;
            } else if (Array.isArray(fulfillmentsData)) {
              fulfillments = fulfillmentsData;
            }

            if (fulfillments && fulfillments.length > 0) {
              const existingFulfillment = fulfillments[0];
              const fulfillmentId = existingFulfillment._id;

              // Try to update fulfillment
              const updateMethod = (fulfillmentAPI as any).updateFulfillment;
              if (typeof updateMethod === 'function') {
                const updateResult = await updateMethod(
                  {
                    orderId: orderId,
                    fulfillmentId: fulfillmentId
                  },
                  {
                    fulfillment: {
                      trackingInfo: {
                        trackingNumber: trackingNumber,
                        shippingProvider: shippingCarrier
                      }
                    }
                  }
                );

                return {
                  success: true,
                  method: 'updateFulfillment',
                  message: `Successfully updated tracking for order #${orderNumber} to ${trackingNumber}`,
                  result: updateResult
                };
              } else {
                throw new Error('updateFulfillment method not available');
              }
            } else {
              throw new Error('No fulfillments found in response');
            }
          } else {
            throw new Error('Could not retrieve fulfillments using any available method');
          }

        } catch (updateError) {
          throw updateError;
        }

      } else {
        const lineItems = orderDetails.lineItems?.map((item: any) => ({
          id: item._id,
          quantity: item.quantity
        })) || [];

        const fulfillmentData = {
          lineItems: lineItems,
          trackingInfo: {
            trackingNumber: trackingNumber,
            shippingProvider: shippingCarrier
          }
        };

        const createMethod = (fulfillmentAPI as any).createFulfillment;
        if (typeof createMethod === 'function') {
          const createResult = await createMethod(orderId, fulfillmentData);

          return {
            success: true,
            method: 'createFulfillment',
            message: `Successfully fulfilled order #${orderNumber} with tracking ${trackingNumber}`,
            result: createResult
          };
        } else {
          throw new Error('createFulfillment method not available');
        }
      }

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMsg,
        message: `Failed to process fulfillment: ${errorMsg}`
      };
    }
  }
);

export const multiply = webMethod(
  Permissions.Anyone,
  (a: number, b: number) => {
    return a * b;
  },
);