 import { t } from "@/lib/translations";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
   Sidebar,
   SidebarContent,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarFooter,
   SidebarTrigger,
   useSidebar,
 } from "@/components/ui/sidebar";
 import {
   Ticket,
   CheckCircle,
   Star,
   Package,
   History,
   PanelLeftClose,
   type LucideIcon,
 } from "lucide-react";
 
 interface StaffSidebarProps {
   activeSection: string;
   onSectionChange: (section: string) => void;
   pendingOrdersCount: number;
   openTicketsCount: number;
   siteName?: string;
 }
 
 interface MenuItem {
   id: string;
   label: string;
   icon: LucideIcon;
   badge?: number;
 }
 
 export function StaffSidebar({
   activeSection,
   onSectionChange,
   pendingOrdersCount,
   openTicketsCount,
   siteName = "Staf",
 }: StaffSidebarProps) {
   const { setOpenMobile, isMobile } = useSidebar();
 
   const menuItems: MenuItem[] = [
     { id: "tickets", label: t.admin.sections.tickets, icon: Ticket, badge: openTicketsCount },
     { id: "orders", label: t.admin.sections.orders, icon: CheckCircle, badge: pendingOrdersCount },
     { id: "ratings", label: t.admin.sections.ratings, icon: Star },
     { id: "stock", label: t.products.stock, icon: Package },
     { id: "activity", label: "Aktivitas", icon: History },
   ];
 
   const handleItemClick = (item: MenuItem) => {
     onSectionChange(item.id);
     if (isMobile) {
       setOpenMobile(false);
     }
   };
 
   return (
     <Sidebar className="border-r-2 border-border bg-background/70 backdrop-blur-sm">
       <SidebarHeader className="border-b-2 border-border p-4">
         <div className="flex items-center gap-2">
           <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-border bg-secondary text-secondary-foreground font-bold">
             S
           </div>
           <div className="flex flex-col">
             <span className="font-bold text-sm">{siteName}</span>
             <span className="text-xs text-muted-foreground">{t.staff.title}</span>
           </div>
         </div>
       </SidebarHeader>
 
       <SidebarContent>
         <ScrollArea className="flex-1">
           <SidebarGroup>
             <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3">
               {t.admin.groups.operations}
             </SidebarGroupLabel>
             <SidebarGroupContent>
               <SidebarMenu>
                 {menuItems.map((item) => {
                   const isActive = activeSection === item.id;
                   const Icon = item.icon;
 
                   return (
                     <SidebarMenuItem key={item.id}>
                       <SidebarMenuButton
                         isActive={isActive}
                         onClick={() => handleItemClick(item)}
                         tooltip={item.label}
                         className={`
                           min-h-[44px] transition-all duration-200
                           ${isActive 
                             ? "bg-primary text-primary-foreground border-l-4 border-l-accent font-semibold" 
                             : "hover:bg-accent/50"
                           }
                         `}
                       >
                         <Icon className="h-4 w-4 shrink-0" />
                         <span className="flex-1">{item.label}</span>
                         {item.badge !== undefined && item.badge > 0 && (
                           <Badge 
                             variant={isActive ? "secondary" : "default"} 
                             className={`
                               ml-auto text-xs px-2 py-0.5 min-w-[20px] justify-center
                               ${item.badge > 0 ? "animate-pulse" : ""}
                             `}
                           >
                             {item.badge > 99 ? "99+" : item.badge}
                           </Badge>
                         )}
                       </SidebarMenuButton>
                     </SidebarMenuItem>
                   );
                 })}
               </SidebarMenu>
             </SidebarGroupContent>
           </SidebarGroup>
         </ScrollArea>
       </SidebarContent>
 
       <SidebarFooter className="border-t-2 border-border p-2">
         <SidebarTrigger className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
           <PanelLeftClose className="h-4 w-4" />
           <span className="text-sm">Tutup Sidebar</span>
         </SidebarTrigger>
       </SidebarFooter>
     </Sidebar>
   );
 }