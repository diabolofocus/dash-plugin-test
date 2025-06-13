// src/backend/orders-api.web.ts - UPDATED with tracking update detection

import { webMethod, Permissions } from '@wix/web-methods';

import {
  smartFulfillOrderElevated,
} from './fulfillment-elevated.web';

interface EmailInfo {
  emailRequested: boolean;
  emailSentAutomatically: boolean;
  emailSent?: boolean;
  customerEmail?: string;
  note: string;
  isTrackingUpdate?: boolean; // NEW: Flag to indicate if this is a tracking update
}

export const fulfillOrderInWix = webMethod(
  Permissions.Anyone,
  async ({
    orderId,
    trackingNumber,
    shippingProvider,
    orderNumber,
    sendShippingEmail = true // Default to true, controlled by frontend checkbox
  }: {
    orderId: string;
    trackingNumber: string;
    shippingProvider: string;
    orderNumber: string;
    sendShippingEmail?: boolean;
  }) => {
    console.log(`🚀 FRONTEND: fulfillOrderInWix called for order ${orderNumber}`, {
      trackingNumber,
      shippingProvider,
      sendShippingEmail
    });

    try {
      // 🔥 NEW: Check if this order is already fulfilled (tracking update scenario)
      let isTrackingUpdate = false;
      try {
        const { getSingleOrder } = await import('./orders-api.web');
        const orderResult = await getSingleOrder(orderId);

        if (orderResult.success && orderResult.order) {
          // If order status is already FULFILLED, this is a tracking update
          isTrackingUpdate = orderResult.order.status === 'FULFILLED';
          console.log(`📋 Order ${orderNumber} status check: ${orderResult.order.status}, isTrackingUpdate: ${isTrackingUpdate}`);
        }
      } catch (statusCheckError) {
        console.warn('Could not check order status before fulfillment:', statusCheckError);
      }

      // 🔥 UPDATED: Pass sendShippingEmail to the elevated method
      const result = await smartFulfillOrderElevated({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail // Pass the email preference to control actual email sending
      });

      console.log(`✅ FRONTEND: fulfillOrderInWix completed for order ${orderNumber}:`, {
        success: result.success,
        method: result.method || 'smartFulfillOrderElevated',
        message: result.message,
        emailRequested: sendShippingEmail,
        isTrackingUpdate
      });

      // 🔥 UPDATED: Different email messages based on whether this is a tracking update
      const emailInfo: EmailInfo = {
        emailRequested: sendShippingEmail,
        emailSentAutomatically: sendShippingEmail, // Only if requested
        isTrackingUpdate,
        note: sendShippingEmail
          ? 'Shipping confirmation sent automatically by Wix (if checkout email settings are enabled for third party apps)'
          : 'Shipping confirmation email was not sent'
      };

      // Only try to get customer email if email was requested and successful
      if (result.success && sendShippingEmail) {
        try {
          const { getSingleOrder } = await import('./orders-api.web');
          const orderResult = await getSingleOrder(orderId);

          if (orderResult.success && orderResult.order) {
            emailInfo.customerEmail = orderResult.order.customer.email;
          }
        } catch (emailError) {
          console.error('Could not get customer details for email confirmation:', emailError);
        }
      }

      return {
        ...result,
        emailInfo,
        isTrackingUpdate // Include this in the response for frontend to show appropriate messages
      };

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ FRONTEND: fulfillOrderInWix failed for order ${orderNumber}:`, error);

      return {
        success: false,
        error: errorMsg,
        message: `Failed to process fulfillment for order ${orderNumber}: ${errorMsg}`,
        method: 'fulfillOrderInWix_simplified',
        emailInfo: {
          emailRequested: sendShippingEmail,
          emailSentAutomatically: false,
          note: 'Email not sent due to fulfillment failure'
        }
      };
    }
  }
);

// Keep your existing methods unchanged...
export const testOrdersConnection = webMethod(
  Permissions.Anyone,
  async ({ limit = 3, cursor = '' }: { limit?: number; cursor?: string } = {}) => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Attempt ${attempt}/${maxRetries} - Starting testOrdersConnection`);

        const ecom = await Promise.race([
          import('@wix/ecom'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), 10000)
          )
        ]) as any;

        if (!ecom || !ecom.orders) {
          throw new Error('ecom.orders not available after initialization');
        }

        console.log('✅ ecom module ready, attempting to search orders...');

        const searchPromise = ecom.orders.searchOrders({
          filter: {
            status: { "$ne": "INITIALIZED" }
          },
          cursorPaging: {
            limit: limit,
            cursor: cursor || undefined
          }
        });

        const result = await Promise.race([
          searchPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Search operation timeout')), 15000)
          )
        ]);

        console.log(`✅ Successfully retrieved ${result.orders?.length || 0} orders`);

        // Your existing order processing logic...
        const parsedOrders = result.orders?.map((order: any) => {
          const recipientContact = order.recipientInfo?.contactDetails;
          const billingContact = order.billingInfo?.contactDetails;
          const buyerInfo = order.buyerInfo;

          const firstName = recipientContact?.firstName || billingContact?.firstName || 'Unknown';
          const lastName = recipientContact?.lastName || billingContact?.lastName || 'Customer';
          const phone = recipientContact?.phone || billingContact?.phone || '';
          const company = recipientContact?.company || billingContact?.company || '';
          const email = buyerInfo?.email || recipientContact?.email || billingContact?.email || 'no-email@example.com';

          // Extract shipping address
          let shippingAddress = null;
          if (order.recipientInfo?.address) {
            const addr = order.recipientInfo.address;
            shippingAddress = {
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
              addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
              addressLine2: addr.addressLine2 || (addr.streetAddress?.apt || '')
            };
          } else if (order.billingInfo?.address) {
            const addr = order.billingInfo.address;
            shippingAddress = {
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

          // IMPROVED STATUS LOGIC
          const rawStatus = order.status;
          const fulfillmentStatus = order.fulfillmentStatus;
          const rawOrderFulfillmentStatus = order.rawOrder?.fulfillmentStatus;

          let orderStatus = 'NOT_FULFILLED';

          if (rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') {
            orderStatus = 'CANCELED';
          } else {
            const actualFulfillmentStatus = fulfillmentStatus || rawOrderFulfillmentStatus || 'NOT_FULFILLED';
            orderStatus = actualFulfillmentStatus;
          }

          // Enhanced payment status mapping
          let paymentStatus = order.paymentStatus || 'UNKNOWN';
          if (order.paymentStatus === 'FULLY_REFUNDED') {
            paymentStatus = 'FULLY_REFUNDED';
          } else if (order.paymentStatus === 'PARTIALLY_REFUNDED') {
            paymentStatus = 'PARTIALLY_REFUNDED';
          }

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
            status: orderStatus,
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
            rawOrder: order
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

      } catch (currentError: unknown) {
        lastError = currentError;
        const errorMsg = currentError instanceof Error ? currentError.message : String(currentError);

        console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMsg);

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError);

    return {
      success: false,
      error: 'eCommerce API not accessible',
      ecomError: finalErrorMsg,
      orders: [],
      orderCount: 0,
      pagination: {
        hasNext: false,
        nextCursor: '',
        prevCursor: ''
      },
      message: `Could not access @wix/ecom orders API after ${maxRetries} attempts. Check permissions and app setup. Last error: ${finalErrorMsg}`
    };
  }
);

export const getSingleOrder = webMethod(
  Permissions.Anyone,
  async (orderId: string) => {
    try {
      const { orders } = await import('@wix/ecom');

      const order = await orders.getOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: `Order with ID ${orderId} not found`
        };
      }

      // Your existing order processing logic...
      const recipientContact = order.recipientInfo?.contactDetails;
      const billingContact = order.billingInfo?.contactDetails;
      const buyerInfo = order.buyerInfo;

      const firstName = recipientContact?.firstName || billingContact?.firstName || 'Unknown';
      const lastName = recipientContact?.lastName || billingContact?.lastName || 'Customer';
      const phone = recipientContact?.phone || billingContact?.phone || '';
      const company = recipientContact?.company || billingContact?.company || '';
      const email = buyerInfo?.email || 'no-email@example.com';

      let shippingAddress = null;
      if (order.recipientInfo?.address) {
        const addr = order.recipientInfo.address;
        shippingAddress = {
          streetAddress: addr.streetAddress ? {
            name: addr.streetAddress.name || '',
            number: addr.streetAddress.number || '',
          } : null,
          city: addr.city || '',
          postalCode: addr.postalCode || '',
          country: addr.country || '',
          countryFullname: addr.countryFullname || addr.country || '',
          subdivision: addr.subdivision || '',
          subdivisionFullname: addr.subdivisionFullname || '',
          addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
          addressLine2: addr.addressLine2 || (addr.streetAddress?.name || '')
        };
      }

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

      const rawStatus = order.status;
      const fulfillmentStatus = order.fulfillmentStatus;

      let orderStatus = 'NOT_FULFILLED';

      console.log(`🔍 getSingleOrder - Status Analysis for ${order.number}:`, {
        rawStatus,
        fulfillmentStatus,
        orderId: order._id
      });

      if (rawStatus === 'CANCELED') {
        orderStatus = 'CANCELED';
      } else {
        orderStatus = fulfillmentStatus || 'NOT_FULFILLED';
      }

      const parsedOrder = {
        _id: order._id,
        number: order.number,
        _createdDate: order._createdDate,
        customer: {
          firstName,
          lastName,
          email,
          phone,
          company
        },
        items: processedItems,
        totalWeight: order.lineItems?.reduce((total: number, item: any) => {
          const itemWeight = item.physicalProperties?.weight || 0;
          const quantity = item.quantity || 1;
          return total + (itemWeight * quantity);
        }, 0) || 0,
        total: order.priceSummary?.total?.formattedAmount || '$0.00',
        status: orderStatus,
        paymentStatus: order.paymentStatus || 'UNKNOWN',
        shippingInfo: {
          carrierId: order.shippingInfo?.carrierId || '',
          title: order.shippingInfo?.title || 'No shipping method',
          cost: order.shippingInfo?.cost?.price?.formattedAmount || '$0.00'
        },
        weightUnit: order.weightUnit || 'KG',
        shippingAddress,
        billingInfo: order.billingInfo,
        recipientInfo: order.recipientInfo,
        rawOrder: order,
        buyerNote: order.buyerNote
      };

      console.log(`✅ getSingleOrder - Final order status for ${order.number}: ${orderStatus}`);

      return {
        success: true,
        order: parsedOrder
      };

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ getSingleOrder error:', errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  }
);

export const multiply = webMethod(
  Permissions.Anyone,
  (a: number, b: number) => {
    return a * b;
  }
);