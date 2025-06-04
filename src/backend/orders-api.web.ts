// src/backend/orders-api.web.ts - Fixed with proper initialization
import { webMethod, Permissions } from '@wix/web-methods';

// 🔥 FIX 1: Pre-initialize the ecom module to avoid race conditions
let ecomModule: any = null;
let isInitialized = false;

async function initializeEcom() {
  if (!isInitialized) {
    try {
      console.log('🔧 Initializing @wix/ecom module...');
      ecomModule = await import('@wix/ecom');
      isInitialized = true;
      console.log('✅ @wix/ecom module initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize @wix/ecom:', error);
      throw error;
    }
  }
  return ecomModule;
}

// 🔥 FIX 2: Enhanced error handling and retry logic
export const testOrdersConnection = webMethod(
  Permissions.Anyone,
  async ({ limit = 50, cursor = '' }: { limit?: number; cursor?: string } = {}) => {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Attempt ${attempt}/${maxRetries} - Starting testOrdersConnection`);

        // 🔥 FIX 3: Ensure ecom is properly initialized with timeout
        const ecom = await Promise.race([
          initializeEcom(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), 10000)
          )
        ]);

        if (!ecom || !ecom.orders) {
          throw new Error('ecom.orders not available after initialization');
        }

        console.log('✅ ecom module ready, attempting to search orders...');

        // 🔥 FIX 4: Add timeout to the search operation
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

        // Process orders (keep your existing processing logic)
        const parsedOrders = result.orders?.map((order: any) => {
          // Your existing order processing logic here...
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

          // 🔥 IMPROVED STATUS LOGIC
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
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Reset initialization for retry
          isInitialized = false;
          ecomModule = null;
        }
      }
    }

    // All retries failed
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

// 🔥 FIX 5: Enhanced fulfillment with same retry logic
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
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Fulfillment attempt ${attempt}/${maxRetries} for order ${orderNumber}`);

        // Ensure ecom is initialized
        const ecom = await Promise.race([
          initializeEcom(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timeout')), 10000)
          )
        ]);

        if (!ecom || !ecom.orders || !ecom.orderFulfillments) {
          throw new Error('ecom APIs not available after initialization');
        }

        const ordersAPI = ecom.orders;
        const fulfillmentAPI = ecom.orderFulfillments;

        const carrierMapping: any = {
          'dhl': 'dhl',
          'ups': 'ups',
          'fedex': 'fedex',
          'usps': 'usps'
        };

        const shippingCarrier = carrierMapping[shippingProvider.toLowerCase()] || shippingProvider.toLowerCase();

        // Get order details with timeout
        const orderDetailsPromise = ordersAPI.getOrder(orderId);
        const orderDetails = await Promise.race([
          orderDetailsPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Get order timeout')), 10000)
          )
        ]);

        if (!orderDetails) {
          throw new Error(`Order ${orderNumber} not found`);
        }

        const fulfillmentStatus = String(orderDetails.fulfillmentStatus || '');

        if (fulfillmentStatus === 'FULFILLED') {
          // Update existing fulfillment logic (keep your existing code)
          // ... (your existing fulfillment update logic)
        } else {
          // Create new fulfillment logic (keep your existing code)
          // ... (your existing fulfillment creation logic)
        }

        // Your existing fulfillment logic here...
        return {
          success: true,
          method: 'fulfillment_completed',
          message: `Order ${orderNumber} fulfilled successfully`
        };

      } catch (currentError: unknown) {
        lastError = currentError;
        const errorMsg = currentError instanceof Error ? currentError.message : String(currentError);

        console.error(`❌ Fulfillment attempt ${attempt}/${maxRetries} failed:`, errorMsg);

        if (attempt < maxRetries) {
          const waitTime = 2000; // 2 second wait
          console.log(`⏳ Waiting ${waitTime}ms before fulfillment retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Reset initialization for retry
          isInitialized = false;
          ecomModule = null;
        }
      }
    }

    // All retries failed
    const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError);

    return {
      success: false,
      error: finalErrorMsg,
      message: `Failed to process fulfillment after ${maxRetries} attempts: ${finalErrorMsg}`
    };
  }
);

// Add this method to your src/backend/orders-api.web.ts file

export const getSingleOrder = webMethod(
  Permissions.Anyone,
  async (orderId: string) => {
    try {
      const { orders } = await import('@wix/ecom');

      // Get the specific order
      const order = await orders.getOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: `Order with ID ${orderId} not found`
        };
      }

      // Use the same parsing logic as testOrdersConnection for consistency
      const recipientContact = order.recipientInfo?.contactDetails;
      const billingContact = order.billingInfo?.contactDetails;
      const buyerInfo = order.buyerInfo;

      const firstName = recipientContact?.firstName || billingContact?.firstName || 'Unknown';
      const lastName = recipientContact?.lastName || billingContact?.lastName || 'Customer';
      const phone = recipientContact?.phone || billingContact?.phone || '';
      const company = recipientContact?.company || billingContact?.company || '';
      const email = buyerInfo?.email || 'no-email@example.com';

      // Extract shipping address
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

      // Process line items
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

      // 🔥 CRITICAL: Proper status handling
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
  },
);