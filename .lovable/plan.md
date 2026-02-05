
# Voucher Analytics Dashboard Implementation

## Overview

Add a comprehensive analytics dashboard for vouchers that provides insights into usage trends, conversion rates, top-performing vouchers, and campaign performance. This will be integrated as a new tab within the VoucherManager component to keep all voucher-related functionality in one place.

---

## 1. Analytics Features

### Key Metrics (Stats Cards)
- **Total Redemptions** - Overall voucher usage count
- **Total Savings Given** - Sum of all discounts applied
- **Conversion Rate** - Orders with voucher vs total verified orders (%)
- **Average Discount** - Mean discount amount per redemption

### Charts & Visualizations
1. **Usage Trend Chart** - Line/area chart showing daily voucher redemptions over time
2. **Top Performing Vouchers** - Horizontal bar chart ranking vouchers by usage or savings
3. **Campaign Performance** - Bar chart comparing campaigns by redemption count and total savings
4. **Discount Distribution** - Pie chart showing percentage vs fixed discount usage
5. **Daily Conversion Funnel** - Shows orders with/without vouchers

---

## 2. Data Requirements

### From `vouchers` table
- Aggregate usage_count, discount_type, campaign_id
- Group by campaign for campaign analytics
- Calculate active vs expired counts

### From `voucher_usage` table
- Time-series data for usage trends (created_at)
- Discount amounts for savings calculations
- Join with vouchers for detailed breakdowns

### From `orders` table
- Orders with voucher_id populated (successful redemptions)
- Compare against total verified orders for conversion rate
- Calculate average order values with/without vouchers

---

## 3. Component Structure

### VoucherAnalytics Component

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  VOUCHER ANALYTICS                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Date Range: [Last 7 days ▼] [Last 30 days] [Last 90 days] [All Time]   │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  📊 156  │  │ 💰 4.2M  │  │  📈 23%  │  │  💵 27K  │                 │
│  │  Total   │  │  Total   │  │ Conver-  │  │ Average  │                 │
│  │ Redeemed │  │ Savings  │  │  sion    │  │ Discount │                 │
│  │   +12%   │  │   +8%    │  │   +5%    │  │   +3%    │                 │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Usage Trends                                                    │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │                          📈                                │  │    │
│  │  │      ****      ***                                         │  │    │
│  │  │    **    **  **   **                                       │  │    │
│  │  │  **        **       **     ****                            │  │    │
│  │  │ *                     ** **    **                          │  │    │
│  │  │                         *        **                        │  │    │
│  │  │ ─────────────────────────────────────────────────────────  │  │    │
│  │  │ Feb 1  Feb 5  Feb 10  Feb 15  Feb 20  Feb 25  Today       │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │  Top Performing Vouchers    │  │  Campaign Performance       │       │
│  │  ─────────────────────────  │  │  ─────────────────────────  │       │
│  │  1. SAVE20      ████ 45    │  │  Feb Sale 2024    ████ 100 │       │
│  │  2. WELCOME10   ███  32    │  │  Valentine 2024   ███  75  │       │
│  │  3. FLASH50     ██   21    │  │  New Year Promo   ██   45  │       │
│  │  4. FIRST15     █    12    │  │  Flash Sale       █    20  │       │
│  │  5. BULK25      █    8     │  │  Influencer       █    10  │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │  Discount Type Distribution │  │  Orders Comparison          │       │
│  │  ─────────────────────────  │  │  ─────────────────────────  │       │
│  │                              │  │                              │       │
│  │       ┌─────────┐           │  │  With Voucher    ████ 156   │       │
│  │      /  68%     \           │  │                              │       │
│  │     | Percentage |          │  │  Without Voucher ████████████│       │
│  │      \          /           │  │                  523         │       │
│  │       └──32%────┘           │  │                              │       │
│  │         Fixed               │  │  Avg Order (w/):  Rp 280K   │       │
│  │                              │  │  Avg Order (w/o): Rp 150K   │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Implementation

### New Component: `VoucherAnalytics.tsx`

**Props:**
- `dateRange`: Selected time period for analytics

**State:**
- `loading`: Boolean for fetch status
- `analyticsData`: Object containing all computed metrics
- `selectedDateRange`: "7" | "30" | "90" | "all"

**Data Fetching:**
```typescript
// Fetch usage data with date filtering
const { data: usageData } = await supabase
  .from("voucher_usage")
  .select("*, vouchers(code, name, campaign_id, discount_type)")
  .gte("created_at", startDate.toISOString());

// Fetch orders for conversion rate
const { data: ordersWithVoucher } = await supabase
  .from("orders")
  .select("id, voucher_id, final_amount, discount_amount")
  .eq("payment_status", "verified")
  .gte("created_at", startDate.toISOString());
```

### Charts Used (from recharts)
- **AreaChart** - Usage trends over time
- **BarChart** (horizontal) - Top vouchers ranking
- **BarChart** (vertical) - Campaign comparison
- **PieChart** - Discount type distribution

---

## 5. Integration with VoucherManager

### Add Tabs Structure

Update VoucherManager to use tabs:
- **Management** tab - Existing voucher table and CRUD
- **Analytics** tab - New analytics dashboard

```typescript
<Tabs defaultValue="management">
  <TabsList>
    <TabsTrigger value="management">Management</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
  </TabsList>
  
  <TabsContent value="management">
    {/* Existing voucher table content */}
  </TabsContent>
  
  <TabsContent value="analytics">
    <VoucherAnalytics />
  </TabsContent>
</Tabs>
```

---

## 6. Analytics Calculations

### Conversion Rate
```typescript
const conversionRate = totalVerifiedOrders > 0 
  ? (ordersWithVoucher / totalVerifiedOrders) * 100 
  : 0;
```

### Average Discount
```typescript
const avgDiscount = totalRedemptions > 0 
  ? totalSavings / totalRedemptions 
  : 0;
```

### Growth Calculation
```typescript
const growth = previousPeriodValue > 0 
  ? ((currentValue - previousPeriodValue) / previousPeriodValue) * 100 
  : 0;
```

### Daily Usage Aggregation
```typescript
const dailyUsage = eachDayOfInterval({ start: startDate, end: endDate })
  .map(date => ({
    date: format(date, "MMM dd"),
    redemptions: usageData.filter(u => 
      format(new Date(u.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ).length,
    savings: usageData.filter(u => 
      format(new Date(u.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ).reduce((sum, u) => sum + u.discount_applied, 0)
  }));
```

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/VoucherAnalytics.tsx` | Create | New analytics dashboard component |
| `src/components/VoucherManager.tsx` | Modify | Add tabs structure and integrate analytics |

---

## 8. UI/UX Considerations

### Design Principles
- Match existing Analytics.tsx styling patterns
- Use MotionStatCard for animated stat cards
- Apply consistent chart colors from COLORS constant
- Responsive grid layout for mobile compatibility

### Date Range Selector
- Quick presets: 7 days, 30 days, 90 days, All time
- Matches the pattern used in Analytics.tsx

### Empty States
- Graceful handling when no voucher usage data exists
- Encouraging message to create and promote vouchers

### Loading States
- Skeleton loaders for charts during data fetch
- Smooth transitions between date range changes

---

## 9. Advanced Analytics (Future Enhancement Ideas)

### Metrics to Consider Later
- Voucher-influenced revenue (order value with vs without voucher)
- Redemption time analysis (when vouchers are most used)
- User segments using vouchers (new vs returning)
- Voucher discovery source (if tracked)

### Export Functionality
- Export analytics as CSV/PDF for reporting
- Scheduled reports via email (requires edge function)
