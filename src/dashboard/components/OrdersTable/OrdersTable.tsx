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

export const OrdersTable: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();
    const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
    const containerRef = useRef(null);
    const [container, setContainer] = useState(null);

    // Initialize container ref
    useEffect(() => {
        setContainer(containerRef);
    }, []);

    // Add scroll detection for infinite loading
    const handleScroll = useCallback(() => {
        if (!containerRef.current || !orderStore.hasMoreOrders || orderStore.isLoadingMore) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        // Load more when user scrolls 80% down
        if (scrollPercentage > 0.8) {
            console.log('🔄 User scrolled near bottom, loading more orders...');
            orderController.loadMoreOrders();
        }
    }, [orderStore.hasMoreOrders, orderStore.isLoadingMore, orderController]);

    // Add scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

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

    const handleViewOrder = (order: Order) => {
        try {
            console.log(`View Order clicked for order #${order.number}`);

            // Navigate using the correct Wix eCommerce page structure
            dashboard.navigate({
                pageId: "ecom-platform.order-details", // Wix eCommerce order details page ID
                relativeUrl: `/${order._id}` // Pass the order ID as the path
            });

        } catch (error) {
            console.error('Failed to navigate to order details:', error);

            // Fallback: Direct URL navigation
            try {
                const currentSiteId = window.location.hostname.split('.')[0]; // Extract site ID
                const orderUrl = `https://manage.wix.com/dashboard/${currentSiteId}/ecom-platform/order-details/${order._id}`;
                window.open(orderUrl, '_blank');
            } catch (fallbackError) {
                console.error('Fallback navigation failed:', fallbackError);

                // Final fallback: Show order in your interface
                orderController.selectOrder(order);
                alert(`Order #${order.number} details are now displayed in the right panel.`);
            }
        }
    };

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
            const paymentMethod = order.rawOrder?.billingInfo?.paymentMethod?.type || 'Credit Card';

            // Generate line items HTML
            const lineItemsHTML = order.rawOrder?.lineItems?.map((item: any) => {
                const productName = item.productName?.original || 'Unknown Product';
                const quantity = item.quantity || 1;
                const price = parseFloat(item.price?.amount) || 0;
                const total = parseFloat(item.totalPriceAfterTax?.amount) || (price * quantity);
                const currency = item.price?.currency || '€';

                // Get product options
                const optionsHTML = item.catalogReference?.options?.options ?
                    Object.entries(item.catalogReference.options.options)
                        .map(([key, value]: [string, any]) => `<div style="color: #666; font-size: 8px;">${key}: ${value}</div>`)
                        .join('') : '';

                return `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px 0; vertical-align: top; width: 60%;">
                        <div style="display: flex; align-items: flex-start;">
                            <div style="width: 50px; height: 40px; background-color: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                                ${item.image ? `<img src="${item.image}" style="max-width: 100%; max-height: 100%; object-fit: cover;" />` : '<span style="font-size: 8px; color: #999;">No Image</span>'}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 10px;">${productName}</div>
                                <div style="color: #666; font-size: 8px; margin-bottom: 2px;">SKU: ${item.catalogReference?.catalogItemId || ''}</div>
                                ${optionsHTML}
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
            }).join('') || '';

            // Create the complete print HTML
            const printElement = document.createElement('div');
            printElement.innerHTML = `
            <div style="padding: 15px; font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
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
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    ${lineItemsHTML}
                </table>

                <!-- Pricing Summary -->
                <div style="margin-bottom: 15px;">
                    <div style="border-top: 1px solid #ddd; padding-top: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">Subtotal</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0; padding-left: 25px;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.subtotal?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">Shipping</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0; padding-left: 25px;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.shipping?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 2px 0;">
                                    <span style="font-size: 11px;">Tax</span>
                                </td>
                                <td style="text-align: right; padding: 2px 0; padding-left: 25px;">
                                    <span style="font-size: 11px;">${order.rawOrder?.priceSummary?.tax?.formattedAmount || '0,00 €'}</span>
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #333;">
                                <td style="text-align: right; padding: 6px 0 2px 0;">
                                    <span style="font-size: 12px; font-weight: bold;">Total</span>
                                </td>
                                <td style="text-align: right; padding: 6px 0 2px 0; padding-left: 25px;">
                                    <span style="font-size: 12px; font-weight: bold;">${order.rawOrder?.priceSummary?.total?.formattedAmount || order.total}</span>
                                </td>
                            </tr>
                        </table>
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

            // Convert to canvas then PDF
            const canvas = await html2canvas(printElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
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

        } catch (error) {
            console.error('Failed to generate PDF:', error);
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
                    return order.status !== 'FULFILLED';
                case 'unpaid':
                    return order.paymentStatus !== 'PAID';
                case 'refunded':
                    return order.paymentStatus?.toLowerCase().includes('refund');
                case 'canceled':
                    return order.status?.toLowerCase().includes('cancel');
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
            width: '90px',
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
                        <Search
                            value={orderStore.searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search by order number, customer name, email, or company.."
                            expandable={false}
                            size="small"
                        />
                    </TableToolbar.Item>
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
                >
                    <Table.Titlebar />
                    <div
                        ref={containerRef}
                        style={{
                            maxHeight: 'calc(100vh - 352px)',
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
                        {orderStore.isLoadingMore && (
                            <Box align="center" padding="24px 0px">
                                <Loader size="small" />
                            </Box>
                        )}
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
            `}</style>
        </Card>
    );
});