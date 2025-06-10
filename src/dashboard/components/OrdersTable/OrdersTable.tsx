// components/OrdersTable/OrdersTable.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
    Card,
    Text,
    Dropdown,
    Search,
    Button,
    Loader,
    Table,
    TableActionCell,
    TableToolbar,
    Box
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate } from '../../utils/formatters';
import type { Order } from '../../types/Order';
import { dashboard } from '@wix/dashboard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { orders } from '@wix/ecom';
import { orderTransactions } from '@wix/ecom';


export const OrdersTable: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();
    const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
    const containerRef = useRef(null);
    const [container, setContainer] = useState(null);

    const loadMoreOrders = useCallback(async () => {
        if (!orderStore.isLoadingMore && orderStore.hasMoreOrders) {
            await orderController.loadMoreOrders();
        }
    }, [orderStore, orderController]);

    // Initialize container ref
    useEffect(() => {
        setContainer(containerRef);
    }, []);


    const statusFilterOptions = [
        { id: 'unfulfilled', value: 'Unfulfilled' },
        { id: 'unpaid', value: 'Unpaid' },
        { id: 'refunded', value: 'Refunded' },
        { id: 'canceled', value: 'Canceled' },
        { id: 'archived', value: 'Archived' }
    ];

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        orderController.updateSearchQuery(e.target.value);
    };

    const handleSearchClear = () => {
        orderController.updateSearchQuery('');
    };

    // Temporarily add this to your component to see what's available
    useEffect(() => {
        console.log('=== @wix/ecom version 1.0.1192 contents ===');

        // Import and check what's available
        import('@wix/ecom').then(ecom => {
            console.log('ecom module:', ecom);
            console.log('ecom keys:', Object.keys(ecom));

            // Check for dashboard-related exports
            Object.keys(ecom).forEach(key => {
                if (key.toLowerCase().includes('dash') || key.toLowerCase().includes('order')) {
                    console.log(`Found relevant key: ${key}`, ecom[key]);
                }
            });
        });
    }, []);

    const handleViewOrder = (order: Order) => {
        try {
            console.log(`View Order clicked for order #${order.number}`);

            // Use known eCommerce page IDs from the Wix documentation
            dashboard.navigate({
                pageId: "14537e1a-3a8c-4a32-87b2-9ec50cea0e7d", // Order details page
                relativeUrl: `/${order._id}`
            });

        } catch (error) {
            console.error('Failed to navigate:', error);

            // Fallback to your existing order details panel
            orderController.selectOrder(order);
        }
    };

    // Helper function to convert Wix image URLs to accessible URLs
    const convertWixImageUrl = (imageUrl: string): string => {
        if (!imageUrl) return '';

        // Handle wix:image:// URLs
        if (imageUrl.startsWith('wix:image://v1/')) {
            // Extract the image ID from the wix:image URL
            const imageId = imageUrl.replace('wix:image://v1/', '').split('#')[0];
            return `https://static.wixstatic.com/media/${imageId}/v1/fill/w_100,h_100,al_c,q_80,usm_0.66_1.00_0.01,enc_auto/${imageId}.jpg`;
        }

        // Handle static.wixstatic.com URLs
        if (imageUrl.includes('static.wixstatic.com')) {
            try {
                const url = new URL(imageUrl);
                // Add image optimization parameters
                url.searchParams.set('w', '100');
                url.searchParams.set('h', '100');
                url.searchParams.set('fit', 'fill');
                url.searchParams.set('f', 'jpg');
                return url.toString();
            } catch (error) {
                console.warn('Invalid URL format:', imageUrl);
                return imageUrl;
            }
        }

        // For any other URL format, try to add parameters if it's a valid URL
        try {
            const url = new URL(imageUrl);
            url.searchParams.set('w', '100');
            url.searchParams.set('h', '100');
            url.searchParams.set('fit', 'fill');
            url.searchParams.set('f', 'jpg');
            return url.toString();
        } catch (error) {
            // If it's not a valid URL, return as is
            return imageUrl;
        }
    };

    // Updated convertImageToBase64 function
    const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
        try {
            if (!imageUrl || imageUrl.trim() === '') {
                console.log('No image URL provided');
                return '';
            }

            console.log('Original image URL:', imageUrl);

            // Convert Wix image URL to accessible format
            const accessibleUrl = convertWixImageUrl(imageUrl);
            console.log('Converted image URL:', accessibleUrl);

            // Try multiple fallback URLs
            const urlsToTry = [
                accessibleUrl,
                // Fallback 1: Basic static.wixstatic.com URL
                imageUrl.startsWith('wix:image://v1/')
                    ? `https://static.wixstatic.com/media/${imageUrl.replace('wix:image://v1/', '').split('#')[0]}`
                    : null,
                // Fallback 2: With different parameters
                imageUrl.startsWith('wix:image://v1/')
                    ? `https://static.wixstatic.com/media/${imageUrl.replace('wix:image://v1/', '').split('#')[0]}/v1/fit/w_100,h_100,al_c,q_80/${imageUrl.replace('wix:image://v1/', '').split('#')[0].split('~')[0]}.jpg`
                    : null
            ].filter(Boolean);

            for (const urlToTry of urlsToTry) {
                try {
                    console.log('Trying URL:', urlToTry);

                    const response = await fetch(urlToTry, {
                        mode: 'cors',
                        headers: {
                            'Accept': 'image/*'
                        }
                    });

                    if (!response.ok) {
                        console.warn(`HTTP error for ${urlToTry}! status: ${response.status}`);
                        continue;
                    }

                    const blob = await response.blob();
                    console.log('Image blob size:', blob.size, 'bytes');

                    if (blob.size === 0) {
                        console.warn('Empty blob received');
                        continue;
                    }

                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result as string;
                            console.log('Base64 conversion successful, length:', result.length);
                            resolve(result);
                        };
                        reader.onerror = () => reject(new Error('Failed to convert image to base64'));
                        reader.readAsDataURL(blob);
                    });
                } catch (error) {
                    console.warn(`Failed to fetch from ${urlToTry}:`, error);
                    continue;
                }
            }

            throw new Error('All image URL attempts failed');
        } catch (error) {
            console.error('Error converting image to base64:', error);
            return ''; // Return empty string as fallback
        }
    };

    // Updated extractImageUrl function with better Wix URL handling
    const extractImageUrl = (item: any): string => {
        // Try different possible locations for the image URL
        const possibleImagePaths = [
            item.image,
            item.imageUrl,
            item.mediaUrl,
            item.thumbnail,
            item.catalogReference?.options?.image,
            item.productSnapshot?.image,
            item.productSnapshot?.media?.[0]?.url,
            item.catalogReference?.catalogItemId // Sometimes the image is linked via catalog item
        ];

        for (const path of possibleImagePaths) {
            if (path && typeof path === 'string' && path.trim() !== '') {
                console.log('Found image URL:', path);
                return path;
            }
        }

        console.log('No image URL found for item:', item.productName?.original);
        return '';
    };

    // Complete handlePrintOrder function with improved pricing layout
    const handlePrintOrder = async (order: Order) => {
        try {
            console.log(`Generating PDF for order #${order.number}`);

            // Get customer info from multiple sources
            const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
            const billingContact = order.rawOrder?.billingInfo?.contactDetails;
            const customerFirstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
            const customerLastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
            const customerEmail = recipientContact?.email || billingContact?.email || order.customer.email || '';
            const customerPhone = recipientContact?.phone || billingContact?.phone || order.customer.phone || '';

            // Get shipping info
            const shippingAddress = order.rawOrder?.shippingInfo?.shipmentDetails?.address;
            const shippingMethod = order.rawOrder?.shippingInfo?.title || 'Standard Shipping';

            // Get billing info
            const billingAddress = order.rawOrder?.billingInfo?.address;

            // Fetch payment method from order transactions
            let paymentMethod = 'Credit Card'; // Default fallback
            try {
                console.log('Fetching payment method for order:', order._id);
                const transactionResponse = await orderTransactions.listTransactionsForSingleOrder(order._id);
                const payments = transactionResponse.orderTransactions?.payments || [];

                if (payments.length > 0) {
                    const firstPayment = payments[0];
                    const rawPaymentMethod = firstPayment.regularPaymentDetails?.paymentMethod ||
                        (firstPayment.giftcardPaymentDetails ? 'Gift Card' : null);

                    // Format payment method for display
                    if (rawPaymentMethod) {
                        switch (rawPaymentMethod) {
                            case 'CreditCard':
                                paymentMethod = 'Credit Card';
                                break;
                            case 'PayPal':
                                paymentMethod = 'PayPal';
                                break;
                            case 'Cash':
                                paymentMethod = 'Cash';
                                break;
                            case 'Offline':
                                paymentMethod = 'Offline Payment';
                                break;
                            case 'InPerson':
                                paymentMethod = 'In Person';
                                break;
                            case 'PointOfSale':
                                paymentMethod = 'Point of Sale';
                                break;
                            case 'Gift Card':
                                paymentMethod = 'Gift Card';
                                break;
                            default:
                                paymentMethod = rawPaymentMethod;
                        }
                    }
                    console.log('Payment method found:', paymentMethod);
                } else {
                    console.log('No payments found for order');
                }
            } catch (error) {
                console.error('Error fetching payment method:', error);
                // Keep default fallback value
            }

            // STEP 1: Process all images first (convert to base64) with improved Wix URL handling
            const processedLineItems = await Promise.all(
                (order.rawOrder?.lineItems || []).map(async (item: any) => {
                    let base64Image = '';

                    // Extract image URL from various possible locations
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

            // STEP 2: Generate line items HTML with base64 images and options instead of SKU
            const lineItemsHTML = processedLineItems.map((item: any) => {
                const productName = item.productName?.original || 'Unknown Product';
                const quantity = item.quantity || 1;
                const price = parseFloat(item.price?.amount) || 0;
                const total = parseFloat(item.totalPriceAfterTax?.amount) || (price * quantity);
                const currency = item.price?.currency || '€';

                // Get product options - improved extraction
                let optionsHTML = '';
                if (item.catalogReference?.options?.options) {
                    optionsHTML = Object.entries(item.catalogReference.options.options)
                        .map(([key, value]: [string, any]) => `<div style="color: #666; font-size: 8px;">${key}: ${value}</div>`)
                        .join('');
                } else if (item.options) {
                    // Alternative location for options
                    optionsHTML = Object.entries(item.options)
                        .map(([key, value]: [string, any]) => `<div style="color: #666; font-size: 8px;">${key}: ${value}</div>`)
                        .join('');
                } else if (item.productName?.translated && item.productName.translated !== item.productName.original) {
                    // Show translated name as an option if different
                    optionsHTML = `<div style="color: #666; font-size: 8px;">Variant: ${item.productName.translated}</div>`;
                }

                // Use base64 image if available, otherwise show placeholder
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

            // STEP 3: Create the complete print HTML with improved pricing layout
            const printElement = document.createElement('div');
            printElement.innerHTML = `
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

            // Add to document temporarily
            printElement.style.position = 'absolute';
            printElement.style.left = '-9999px';
            printElement.style.top = '0';
            document.body.appendChild(printElement);

            // Convert to canvas then PDF with better settings for images
            const canvas = await html2canvas(printElement, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: true,
                imageTimeout: 15000, // Increased timeout for image loading
                onclone: (clonedDoc) => {
                    // Ensure all images are properly loaded in cloned document
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

            // Create PDF with single page
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

            // Create blob URL and open
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, '_blank');

            // Clean up
            document.body.removeChild(printElement);

            console.log(`PDF generated successfully for order #${order.number}`);

        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleArchiveOrder = async (order: Order) => {
        try {
            console.log(`Archiving order #${order.number}`);

            // Confirm with user before archiving
            const confirmed = window.confirm(`Are you sure you want to archive order #${order.number}?`);

            if (!confirmed) {
                return;
            }

            // Prepare order update data
            const ordersToUpdate = [
                {
                    order: {
                        id: order._id,
                        archived: true
                    }
                }
            ];

            const options = {
                returnEntity: false
            };

            // Archive the order
            const response = await orders.bulkUpdateOrders(ordersToUpdate, options);
            console.log("Order archived successfully:", response);

            // Show success message
            alert(`Order #${order.number} has been archived successfully!`);

        } catch (error) {
            console.error("Error archiving order:", error);
            alert(`Failed to archive order #${order.number}. Please try again.`);
        }
    };

    // Filter orders based on status selection
    const getFilteredOrdersByStatus = (orders: Order[], statusFilter: string | null) => {
        if (!statusFilter) return orders;

        return orders.filter(order => {
            switch (statusFilter) {
                case 'unfulfilled':
                    // Show only orders that are not fulfilled and not canceled/archived
                    const isCanceled = order.rawOrder?.archived === true ||
                        (order as any).archived === true ||
                        order.rawOrder?.status === 'CANCELED' ||
                        order.rawOrder?.status === 'CANCELLED';

                    return (order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED') &&
                        !isCanceled;

                case 'fulfilled':
                    // Show only fulfilled orders that are not canceled/archived
                    const isCanceledFulfilled = order.rawOrder?.archived === true ||
                        (order as any).archived === true ||
                        order.rawOrder?.status === 'CANCELED' ||
                        order.rawOrder?.status === 'CANCELLED';

                    return order.status === 'FULFILLED' && !isCanceledFulfilled;

                case 'unpaid':
                    // Use correct paymentStatus enum values from ecom.orders.getOrder()
                    return order.paymentStatus === 'UNPAID' ||
                        order.paymentStatus === 'PARTIALLY_PAID' ||
                        order.rawOrder?.paymentStatus === 'NOT_PAID' ||
                        order.rawOrder?.paymentStatus === 'PENDING';

                case 'refunded':
                    // Use correct refunded status values
                    return order.paymentStatus === 'FULLY_REFUNDED' ||
                        order.paymentStatus === 'PARTIALLY_REFUNDED';

                case 'canceled':
                    return order.rawOrder?.canceled === true ||
                        (order as any).canceled === true ||
                        order.rawOrder?.status === 'CANCELED' ||
                        order.rawOrder?.status === 'CANCELLED';
                case 'archived':
                    return order.rawOrder?.archived === true || (order as any).archived === true;

                default:
                    return true;
            }
        });
    };
    const handleRowClick = (order: Order, event?: any) => {
        // Remove all previous selections
        document.querySelectorAll('[data-selected-order]').forEach(row => {
            row.removeAttribute('data-selected-order');
        });

        // Get the clicked row element and mark it as selected
        const clickedRow = event?.currentTarget?.closest('tr');
        if (clickedRow) {
            clickedRow.setAttribute('data-selected-order', order._id);
        }

        // Update store for other functionality (OrderDetails panel)
        orderController.selectOrder(order);
    };

    // Define table columns
    const columns = [
        {
            title: 'Order',
            render: (order: Order) => (
                <Text size="small" weight="normal">
                    #{order.number}
                </Text>
            ),
            width: '70px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Date Created',
            render: (order: Order) => (
                <Text size="small">
                    {formatDate(order._createdDate)}
                </Text>
            ),
            width: '90px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Customer',
            render: (order: Order) => {
                // Safely extract contact details with fallbacks
                const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
                const billingContact = order.rawOrder?.billingInfo?.contactDetails;

                const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
                const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
                const customerName = `${firstName} ${lastName}`;
                const company = recipientContact?.company || billingContact?.company || order.customer.company;

                return (
                    <Box direction="vertical" gap="2px">
                        <Text size="small" ellipsis>{customerName}</Text>
                        {company && (
                            <Text size="tiny" secondary ellipsis>{company}</Text>
                        )}
                    </Box>
                );
            },
            width: '140px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Payment',
            render: (order: Order) => (
                <StatusBadge status={order.paymentStatus} type="payment" />
            ),
            width: '80px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Fulfillment',
            render: (order: Order) => (
                <StatusBadge status={order.status} type="order" />
            ),
            width: '100px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Total',
            render: (order: Order) => (
                <Text size="small">{order.total}</Text>
            ),
            width: '70px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Actions',
            render: (order: Order) => (
                <TableActionCell
                    size="small"
                    popoverMenuProps={{
                        zIndex: 1000,
                        appendTo: "window"
                    }}
                    secondaryActions={[
                        {
                            text: "View Order",
                            icon: <Icons.Order />,
                            onClick: () => handleViewOrder(order)
                        },
                        {
                            text: "Print Order",
                            icon: <Icons.Print />,
                            onClick: () => handlePrintOrder(order)
                        },
                        {
                            divider: true
                        },
                        {
                            text: "Archive Order",
                            icon: <Icons.Archive />,
                            onClick: () => handleArchiveOrder(order)
                        }
                    ]}
                    numOfVisibleSecondaryActions={0}
                    alwaysShowSecondaryActions={false}
                />
            ),
            width: '80px',
            align: 'end' as const,
            stickyActionCell: true,
            overflow: 'hidden'
        }
    ];

    const statusFilteredOrders = getFilteredOrdersByStatus(orderStore.filteredOrders, selectedStatusFilter);
    const tableData = statusFilteredOrders.map(order => ({
        id: order._id,
        ...order
    }));

    // Move this useEffect to after the statusFilteredOrders and tableData declarations
    useEffect(() => {
        if (orderStore.selectedOrder) {
            // Small delay to ensure table is rendered
            setTimeout(() => {
                // Remove all previous selections
                document.querySelectorAll('[data-selected-order]').forEach(row => {
                    row.removeAttribute('data-selected-order');
                });

                // Find and highlight the selected order row
                const rows = document.querySelectorAll('tbody tr');
                rows.forEach((row, index) => {
                    const orderData = statusFilteredOrders[index];
                    if (orderData && orderData._id === orderStore.selectedOrder._id) {
                        row.setAttribute('data-selected-order', orderData._id);
                    }
                });
            }, 100);
        }
    }, [orderStore.selectedOrder, statusFilteredOrders]);

    return (
        <Card>
            <TableToolbar>
                <TableToolbar.ItemGroup position="start">
                    <TableToolbar.Item>
                        <TableToolbar.Title>
                            Recent Orders
                        </TableToolbar.Title>
                    </TableToolbar.Item>
                    {orderStore.loadingStatus && (
                        <TableToolbar.Item>
                            <TableToolbar.Label>
                                {orderStore.loadingStatus}
                            </TableToolbar.Label>
                        </TableToolbar.Item>
                    )}
                </TableToolbar.ItemGroup>
                <TableToolbar.ItemGroup position="end">
                    <TableToolbar.Item>
                        <Dropdown
                            placeholder="Filter by status"
                            clearButton
                            onClear={() => setSelectedStatusFilter(null)}
                            onSelect={(option) => setSelectedStatusFilter(option.id)}
                            selectedId={selectedStatusFilter}
                            options={statusFilterOptions}
                            border="round"
                            size="small"
                        />
                    </TableToolbar.Item>
                    <TableToolbar.Item>
                        <div style={{ width: '310px' }}>
                            <Search
                                value={orderStore.searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search by order number, name or email.."
                                expandable={false}
                                size="small"
                            />
                        </div>
                    </TableToolbar.Item>

                </TableToolbar.ItemGroup>
            </TableToolbar>

            <div
                style={{
                    overflowX: 'auto',
                    width: '100%'
                }}
            >
                <Table
                    data={tableData}
                    columns={columns}
                    onRowClick={(rowData, event) => handleRowClick(rowData as Order, event)}
                    horizontalScroll
                    infiniteScroll
                    loadMore={loadMoreOrders}
                    hasMore={orderStore.hasMoreOrders}
                    itemsPerPage={100}
                    scrollElement={container && container.current}
                    loader={
                        <Box align="center" padding="24px 0px">
                            <Loader size="small" />
                        </Box>
                    }
                >
                    <Table.Titlebar />
                    <div
                        ref={containerRef}
                        className="orders-table-container"
                        style={{
                            maxHeight: 'calc(100vh - 194px)',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        }}
                    >
                        {statusFilteredOrders.length === 0 ? (
                            <Box align="center" paddingTop="40px" paddingBottom="40px">
                                <Text secondary>No orders found</Text>
                            </Box>
                        ) : (
                            <Table.Content titleBarVisible={false} />
                        )}
                        {/* Add loading indicator for "load more" */}
                        {/* {orderStore.isLoadingMore && (
                            <Box align="center" padding="24px 0px">
                                <Loader size="small" />
                            </Box>
                        )} */}
                    </div>
                </Table>
            </div>

            {/* Add some CSS styles for better visual feedback */}
            <style>{`
                .canceled-row {
                    opacity: 0.6;
                }
                .canceled-row * {
                    color: #9ca3af !important;
                }
                tr[data-selected-order] {
                    background-color: #e9f0fe !important;
                }
                .orders-table-container {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
    }
    
    .orders-table-container::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
    }
                    
            `}</style>
        </Card>
    );
});