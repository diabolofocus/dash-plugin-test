// components/OrdersTable/utils/printOrderUtils.ts - Updated to use existing image-processor
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { orderTransactions } from '@wix/ecom';
import { formatDate } from '../utils/formatters';
import { convertImageToBase64, extractImageUrl } from '../utils/image-processor';
import type { Order } from '../types/Order';

const formatPaymentMethod = (rawPaymentMethod: string | null): string => {
    if (!rawPaymentMethod) return 'Credit Card';

    switch (rawPaymentMethod) {
        case 'CreditCard': return 'Credit Card';
        case 'PayPal': return 'PayPal';
        case 'Cash': return 'Cash';
        case 'Offline': return 'Offline Payment';
        case 'InPerson': return 'In Person';
        case 'PointOfSale': return 'Point of Sale';
        case 'Gift Card': return 'Gift Card';
        default: return rawPaymentMethod;
    }
};

const fetchPaymentMethod = async (orderId: string): Promise<string> => {
    try {
        console.log('Fetching payment method for order:', orderId);
        const transactionResponse = await orderTransactions.listTransactionsForSingleOrder(orderId);
        const payments = transactionResponse.orderTransactions?.payments || [];

        if (payments.length > 0) {
            const firstPayment = payments[0];
            const rawPaymentMethod = firstPayment.regularPaymentDetails?.paymentMethod ||
                (firstPayment.giftcardPaymentDetails ? 'Gift Card' : null);

            const formatted = formatPaymentMethod(rawPaymentMethod);
            console.log('Payment method found:', formatted);
            return formatted;
        } else {
            console.log('No payments found for order');
            return 'Credit Card'; // Default fallback
        }
    } catch (error) {
        console.error('Error fetching payment method:', error);
        return 'Credit Card'; // Default fallback
    }
};

const processOrderImages = async (lineItems: any[]): Promise<any[]> => {
    return await Promise.all(
        lineItems.map(async (item: any) => {
            let base64Image = '';
            const imageUrl = extractImageUrl(item);

            if (imageUrl) {
                try {
                    console.log(`Converting image for ${item.productName?.original}: ${imageUrl}`);
                    base64Image = await convertImageToBase64(imageUrl);
                    console.log(`Image conversion ${base64Image ? 'successful' : 'failed'} for ${item.productName?.original}`);
                } catch (error) {
                    console.error(`Failed to convert image for ${item.productName?.original}:`, error);
                }
            }

            return {
                ...item,
                base64Image,
                originalImageUrl: imageUrl
            };
        })
    );
};

const generateLineItemsHTML = (processedLineItems: any[]): string => {
    return processedLineItems.map((item: any) => {
        const productName = item.productName?.original || 'Unknown Product';
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price?.amount) || 0;
        const total = parseFloat(item.totalPriceAfterTax?.amount) || (price * quantity);
        const currency = item.price?.currency || '€';

        // Get product options
        let optionsHTML = '';
        if (item.catalogReference?.options?.options) {
            optionsHTML = Object.entries(item.catalogReference.options.options)
                .map(([key, value]: [string, any]) => `<div style="color: #666; font-size: 8px;">${key}: ${value}</div>`)
                .join('');
        } else if (item.options) {
            optionsHTML = Object.entries(item.options)
                .map(([key, value]: [string, any]) => `<div style="color: #666; font-size: 8px;">${key}: ${value}</div>`)
                .join('');
        } else if (item.productName?.translated && item.productName.translated !== item.productName.original) {
            optionsHTML = `<div style="color: #666; font-size: 8px;">Variant: ${item.productName.translated}</div>`;
        }

        const imageHTML = item.base64Image
            ? `<img src="${item.base64Image}" style="max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 2px;" alt="${productName}" />`
            : '<span style="font-size: 8px; color: #999; text-align: center; display: block;">No Image</span>';

        return `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px 0; vertical-align: top; width: 60%;">
                    <div style="display: flex; align-items: flex-start;">
                        <div style="width: 50px; height: 40px; background-color: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${imageHTML}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; margin-bottom: 3px; font-size: 10px;">${productName}</div>
                            ${optionsHTML || '<div style="color: #666; font-size: 8px;">Standard item</div>'}
                        </div>
                    </div>
                </td>
                <td style="text-align: right; padding: 8px 40px 8px 0; vertical-align: top; width: 15%;">
                    <div style="font-size: 10px;">${price.toFixed(2)} ${currency}</div>
                </td>
                <td style="text-align: right; padding: 8px 40px 8px 0; vertical-align: top; width: 10%;">
                    <div style="font-size: 10px;">x ${quantity}</div>
                </td>
                <td style="text-align: right; padding: 8px 0; vertical-align: top; width: 15%;">
                    <div style="font-weight: bold; font-size: 10px;">${total.toFixed(2)} ${currency}</div>
                </td>
            </tr>
        `;
    }).join('');
};

const generatePrintHTML = (
    order: Order,
    lineItemsHTML: string,
    paymentMethod: string,
    customerFirstName: string,
    customerLastName: string,
    customerEmail: string,
    customerPhone: string
): string => {
    const shippingAddress = order.rawOrder?.shippingInfo?.shipmentDetails?.address;
    const shippingMethod = order.rawOrder?.shippingInfo?.title || 'Standard Shipping';
    const billingAddress = order.rawOrder?.billingInfo?.address;

    return `
        <div style="padding: 35px; font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
            <!-- Header -->
            <div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 15px;">
                <h1 style="margin: 0; font-size: 18px; font-weight: bold;">Order #${order.number} (${order.rawOrder?.lineItems?.length || 0} items)</h1>
                <div style="font-size: 9px; color: #666; margin-top: 4px;">
                    Placed on ${formatDate(order._createdDate)}
                </div>
                <div style="font-size: 9px; margin-top: 2px;">
                    ${customerFirstName} ${customerLastName} | ${customerEmail} | ${customerPhone}
                </div>
            </div>

            <!-- Products -->
            <table style="width: 100%; border-collapse: collapse;">
                ${lineItemsHTML}
            </table>

            <!-- Pricing Summary -->
            <div style="margin-bottom: 15px;">
                <div style="padding-top: 8px; margin-top: 15px;">
                    <div style="display: flex; justify-content: flex-end;">
                        <table style="border-collapse: collapse; min-width: 300px;">
                            <tr>
                                <td style="text-align: left; padding: 2px 8px 2px 0;">
                                    <span style="font-size: 11px;">Subtotal</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.subtotal?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 8px 2px 0;">
                                    <span style="font-size: 11px;">Shipping</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.shipping?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: left; padding: 2px 8px 2px 0;">
                                    <span style="font-size: 11px;">Tax</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.tax?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            ${order.rawOrder?.priceSummary?.discount?.amount && order.rawOrder.priceSummary.discount.amount > 0 ? `
                            <tr>
                                <td style="text-align: left; padding: 2px 8px 2px 0;">
                                    <span style="font-size: 11px;">Discount${order.rawOrder?.appliedDiscounts && order.rawOrder.appliedDiscounts.length > 0 ? ` (${order.rawOrder.appliedDiscounts.map((discount: any) => discount.discountName || discount.name || 'Discount').join(', ')})` : ''}</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">${order.rawOrder.priceSummary.discount.formattedAmount || `${order.rawOrder.priceSummary.discount.amount} ${order.rawOrder.priceSummary.discount.currency || ''}`}</span>
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="text-align: left; padding: 6px 8px 2px 0; border-top: 1px solid #333;">
                                    <span style="font-size: 12px; font-weight: bold;">Total</span>
                                </td>
                                <td style="text-align: right; padding: 6px 0 2px 0; border-top: 1px solid #333;">
                                    <span style="font-size: 12px; font-weight: bold;">${order.rawOrder?.priceSummary?.total?.formattedAmount || order.total}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Customer Info Section -->
            <div style="margin-top: 15px;">
                <h2 style="font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Customer Info</h2>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <!-- Shipping Address -->
                    <div style="width: 45%;">
                        <h3 style="font-size: 11px; margin-bottom: 6px; font-weight: bold;">Shipping Address</h3>
                        <div style="line-height: 1.2; font-size: 9px;">
                            <div>${customerFirstName} ${customerLastName}</div>
                            ${shippingAddress?.company ? `<div>${shippingAddress.company}</div>` : ''}
                            ${shippingAddress?.addressLine1 ? `<div>${shippingAddress.addressLine1}</div>` : ''}
                            ${shippingAddress?.addressLine2 ? `<div>${shippingAddress.addressLine2}</div>` : ''}
                            ${shippingAddress?.city && shippingAddress?.subdivision ?
            `<div>${shippingAddress.city}, ${shippingAddress.subdivision} ${shippingAddress.postalCode || ''}, ${shippingAddress.country || ''}</div>` : ''}
                            <div style="margin-top: 4px; font-weight: bold;">${shippingMethod}</div>
                        </div>
                    </div>

                    <!-- Billing Address -->
                    <div style="width: 45%;">
                        <h3 style="font-size: 11px; margin-bottom: 6px; font-weight: bold;">Billing Address</h3>
                        <div style="line-height: 1.2; font-size: 9px;">
                            <div>${customerFirstName} ${customerLastName}</div>
                            ${billingAddress?.company ? `<div>${billingAddress.company}</div>` : ''}
                            ${billingAddress?.addressLine1 ? `<div>${billingAddress.addressLine1}</div>` : ''}
                            ${billingAddress?.addressLine2 ? `<div>${billingAddress.addressLine2}</div>` : ''}
                            ${billingAddress?.city && billingAddress?.subdivision ?
            `<div>${billingAddress.city}, ${billingAddress.subdivision} ${billingAddress.postalCode || ''}, ${billingAddress.country || ''}</div>` : ''}
                            <div style="margin-top: 4px; font-weight: bold;">Paid with ${paymentMethod}</div>
                        </div>
                    </div>
                </div>

                <!-- Additional Info -->
                ${order.rawOrder?.customFields && order.rawOrder.customFields.length > 0 ? `
                    <div>
                        <h3 style="font-size: 11px; margin-bottom: 6px; font-weight: bold;">Additional Info</h3>
                        <div style="line-height: 1.2; font-size: 9px;">
                            ${order.rawOrder.customFields.map((field: any) =>
                `<div>${field.translatedTitle || field.title}: ${field.value}</div>`
            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};

export const printOrderToPDF = async (order: Order): Promise<void> => {
    console.log(`Generating PDF for order #${order.number}`);

    // Get customer info from multiple sources
    const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
    const billingContact = order.rawOrder?.billingInfo?.contactDetails;
    const customerFirstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
    const customerLastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
    const customerEmail = recipientContact?.email || billingContact?.email || order.customer.email || '';
    const customerPhone = recipientContact?.phone || billingContact?.phone || order.customer.phone || '';

    // Fetch payment method
    const paymentMethod = await fetchPaymentMethod(order._id);

    // Process images using your existing image processor
    const processedLineItems = await processOrderImages(order.rawOrder?.lineItems || []);

    // Generate HTML
    const lineItemsHTML = generateLineItemsHTML(processedLineItems);
    const printHTML = generatePrintHTML(
        order,
        lineItemsHTML,
        paymentMethod,
        customerFirstName,
        customerLastName,
        customerEmail,
        customerPhone
    );

    // Create print element
    const printElement = document.createElement('div');
    printElement.innerHTML = printHTML;
    printElement.style.position = 'absolute';
    printElement.style.left = '-9999px';
    printElement.style.top = '0';
    document.body.appendChild(printElement);

    try {
        // Convert to canvas then PDF
        const canvas = await html2canvas(printElement, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: true,
            imageTimeout: 15000,
            onclone: (clonedDoc) => {
                const images = clonedDoc.querySelectorAll('img');
                console.log('Found images in cloned document:', images.length);
                images.forEach((img, index) => {
                    console.log(`Image ${index}:`, img.src.substring(0, 50) + '...');
                    if (img.src.startsWith('data:')) {
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        img.style.objectFit = 'cover';
                        img.style.display = 'block';
                    }
                });
            }
        });

        const imgData = canvas.toDataURL('image/png');

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // Scale down if image is too tall for one page
        if (imgHeight > pdfHeight) {
            const scaleFactor = pdfHeight / imgHeight;
            const scaledWidth = imgWidth * scaleFactor;
            const scaledHeight = pdfHeight;
            const xOffset = (pdfWidth - scaledWidth) / 2;

            pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, scaledHeight);
        } else {
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }

        // Open PDF
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');

        console.log(`PDF generated successfully for order #${order.number}`);
    } finally {
        // Clean up
        document.body.removeChild(printElement);
    }
};