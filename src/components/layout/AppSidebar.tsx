import { Building2, ChevronDown, ChevronRight, Plus, Shield, Users, Settings, DollarSign, CheckCircle, Package, LogOut, UserCircle } from "lucide-react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getMenusForRole } from "@/utils/roleBasedMenus";
import { useToast } from "@/hooks/use-toast";
import { hasPermission } from "@/utils/permissionUtils";
import { companyGroupService } from "@/services/companyGroupService";


export function AppSidebar() {
  const { state, isMobile, open, setOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const currentTab = searchParams.get('tab');
  const collapsed = state === "collapsed" && !isMobile;
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebar-expanded-groups');
    return saved ? new Set(JSON.parse(saved)) : new Set(['Companies', 'Asset Management']);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded-groups', JSON.stringify([...expandedGroups]));
  }, [expandedGroups]);
  const [groups, setGroups] = useState<any[]>([]);
  const [spans, setSpans] = useState<any[]>([]);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddCircularGroupOpen, setIsAddCircularGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [circularGroupName, setCircularGroupName] = useState('');
  const isApprover = user?.isApprover || user?.appUser?.isApprover || false;
  
  // Use Admin menu structure for all users and filter by permissions
  const filterMenusByPermissions = (menus: any[]) => {
    if (role === 'Super Admin') return menus;
    if (role === 'Tenant') return menus;
    
    return menus.map(group => {
      if (group.expandable) {
        if (group.title === 'Master Settings' && group.subItems) {
          const filteredSubItems = group.subItems.filter((item: any) => {
            if (item.title === 'Settings') return hasPermission(user?.appUser, 'Settings', 'view');
            if (item.title === 'User Management') return hasPermission(user?.appUser, 'Users', 'view');
            if (item.title === 'Asset Form') return hasPermission(user?.appUser, 'Asset Form', 'view');
            if (item.title === 'Tenant Form') return hasPermission(user?.appUser, 'Tenant Form', 'view');
            return true;
          });
          return filteredSubItems.length > 0 ? { ...group, subItems: filteredSubItems } : null;
        }
        if (group.title === 'Asset Management') {
          return hasPermission(user?.appUser, 'Assets', 'view') ? group : null;
        }
        if (group.title === 'Companies') {
          return hasPermission(user?.appUser, 'Companies', 'view') ? group : null;
        }
        return group;
      }
      
      const filteredItems = group.items.filter((item: any) => {
        if (item.title === 'Overview') return hasPermission(user?.appUser, 'Overview', 'view');
        if (item.title === 'Buildings') return hasPermission(user?.appUser, 'Buildings', 'view');
        if (item.title === 'Tenants') return hasPermission(user?.appUser, 'Tenants', 'view');
        if (item.title === 'Accounts') {
          return ['Invoices', 'Rent Collection', 'Expenses', 'Deposits', 'Financial Reports'].some(module => 
            hasPermission(user?.appUser, module, 'view')
          );
        }
        if (item.title === 'Helpdesk') return hasPermission(user?.appUser, 'Helpdesk', 'view') || hasPermission(user?.appUser, 'Manage Tickets', 'view');
        return true;
      });
      
      return { ...group, items: filteredItems };
    }).filter(group => group !== null && (group.items?.length > 0 || group.expandable));
  };
  
  const [navigationItems, setNavigationItems] = useState(() => 
    filterMenusByPermissions(getMenusForRole(role === 'Tenant' ? 'Tenant' : 'Admin', isApprover, user?.appUser?.permissions))
  );

  // Load company groups from database
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const companyGroups = await companyGroupService.getAllCompanyGroups();
        setGroups(companyGroups);
      } catch (error) {
        // Failed to load company groups
      }
    };
    loadGroups();
  }, []);

  useEffect(() => {
    const baseMenus = getMenusForRole(role === 'Tenant' ? 'Tenant' : 'Admin', isApprover, user?.appUser?.permissions);
    const filteredMenus = filterMenusByPermissions(baseMenus);
    setNavigationItems(filteredMenus);
  }, [role, isApprover, user]);

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim()) {
      try {
        const newGroup = await companyGroupService.addCompanyGroup({
          name: groupName.trim(),
          description: ''
        });
        if (newGroup) {
          setGroups(prev => [...prev, newGroup]);
          toast({ title: "Success", description: `Group "${groupName}" added successfully` });
          setGroupName('');
          setIsAddGroupOpen(false);
        } else {
          toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
      }
    }
  };

  const handleAddCircularGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (circularGroupName.trim()) {
      const newSpan = {
        id: Date.now().toString(),
        name: circularGroupName.trim()
      };
      setSpans(prev => [...prev, newSpan]);
      toast({ title: "Success", description: `Group "${circularGroupName}" added successfully` });
      setCircularGroupName('');
      setIsAddCircularGroupOpen(false);
    }
  };

  const isActive = (path: string) => {
    // Handle query parameter routes (e.g., /admin/master-settings?tab=tenant&section=service_charges)
    if (path.includes('?')) {
      const [basePath, queryString] = path.split('?');
      if (currentPath !== basePath) return false;
      
      // Parse query parameters from the path
      const pathParams = new URLSearchParams(queryString);
      const pathTab = pathParams.get('tab');
      const pathSection = pathParams.get('section');
      
      // Get current URL parameters
      const currentSection = searchParams.get('section');
      
      // Match both tab and section if section exists in path
      if (pathSection) {
        return currentTab === pathTab && currentSection === pathSection;
      }
      
      // Match only tab if no section in path, and no section in current URL
      return currentTab === pathTab && !currentSection;
    }
    
    // For paths without query params, only match if current URL also has no tab param
    // This prevents /admin/master-settings from being active when on /admin/master-settings?tab=tenant
    if (currentPath === path) {
      // If we're on a path with query params, don't match paths without query params
      if (currentTab && !path.includes('?')) {
        return false;
      }
      return true;
    }
    
    // For base dashboard route without query params, only active if no tab param exists
    if (path === '/tenant/dashboard' && currentPath === '/tenant/dashboard') {
      return !currentTab;
    }
    
    // Handle sub-routes under the same section (but not for root path)
    if (path !== '/' && currentPath.startsWith(path + '/')) return true;
    
    return false;
  };

  const getNavClass = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-r-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";
  };

  return (
    <Sidebar 
      className="transition-all duration-300 ease-in-out h-screen flex-shrink-0"
      collapsible={isMobile ? "offcanvas" : "icon"}
      onMouseEnter={() => !isMobile && collapsed && setOpen(true)}
      onMouseLeave={() => !isMobile && !collapsed && setOpen(false)}
    >
      <SidebarContent className="bg-dashboard-sidebar overflow-y-auto overflow-x-hidden relative h-full flex flex-col w-full">
        {/* Buildings Watermark */}
        <div className={`fixed top-0 left-0 ${collapsed ? "w-16" : "w-64"} h-full flex items-start justify-center opacity-5 pointer-events-none transition-all duration-300 ease-in-out`}>
          <img 
            src="/Logo/Buildings-tenant.png" 
            alt="Buildings" 
            className="w-full h-full object-cover object-top"
          />
        </div>
        {/* Logo Section */}
        <div className="p-3 md:p-4 border-b border-sidebar-border">
          {!collapsed || isMobile ? (
            <img 
              src="/Logo/Rathinam Techpark Logo.jpeg" 
              alt="Rathinam Techpark" 
              className="w-4.2/5 h-auto object-contain mx-auto"
            />
          ) : (
            <img 
              src="/Logo/Rathinam College Logo.png" 
              alt="Rathinam College" 
              className="w-10 md:w-12 h-10 md:h-12 object-contain mx-auto"
            />
          )}
        </div>

        {/* Navigation Groups - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {navigationItems.length > 0 ? (
          navigationItems.map((group, index) => (
            <SidebarGroup key={`${group.title}-${index}`} className={group.expandable ? "p-0" : "px-2"}>
              {!group.expandable && group.title !== 'Operations' && group.title !== '' && (
                <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">
                  {group.title}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                {!group.expandable && (
                  <SidebarMenu>
                    {group.items.map((item) => {
                      // Check if this is a query parameter route
                      const isQueryRoute = item.url.includes('?tab=');
                      
                      if (isQueryRoute) {
                        return (
                          <SidebarMenuItem key={item.title}>
                            <button
                              onClick={() => navigate(item.url)}
                              className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 h-8 text-sm ${getNavClass(item.url)}`}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </button>
                          </SidebarMenuItem>
                        );
                      }
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <NavLink 
                            to={item.url} 
                            className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 h-8 text-sm group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 ${getNavClass(item.url)}`}
                            onClick={(e) => {
                              if (collapsed) {
                                e.preventDefault();
                                setOpen(false);
                                setTimeout(() => navigate(item.url), 0);
                              }
                            }}
                            title={collapsed ? item.title : ''}
                          >
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                )}

                {/* Master Settings Expandable Section */}
                {group.expandable && group.title === 'Master Settings' && (
                  <SidebarMenu className="px-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => toggleGroup('Master Settings')}
                        className="cursor-pointer hover:bg-sidebar-accent/50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            {!collapsed && <span>Master Settings</span>}
                          </div>
                          {!collapsed && (
                            expandedGroups.has('Master Settings') ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {!collapsed && group.subItems && (
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedGroups.has('Master Settings') ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {group.subItems.map((item) => (
                          <div key={item.title}>
                            {item.expandable ? (
                              <>
                                <SidebarMenuItem>
                                  <SidebarMenuButton 
                                    onClick={() => toggleGroup(item.title)}
                                    className="cursor-pointer hover:bg-sidebar-accent/50"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-2">
                                        <item.icon className="h-4 w-4" />
                                        <span className="text-sm">{item.title}</span>
                                      </div>
                                      {expandedGroups.has(item.title) ? 
                                        <ChevronDown className="h-3 w-3" /> : 
                                        <ChevronRight className="h-3 w-3" />
                                      }
                                    </div>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                                {item.subItems && (
                                  <div className={`ml-6 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                                    expandedGroups.has(item.title) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                  }`}>
                                    {item.subItems.map((subItem) => (
                                      <SidebarMenuItem key={subItem.title}>
                                        <button
                                          onClick={() => navigate(subItem.url)}
                                          className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 h-8 text-xs ${getNavClass(subItem.url)}`}
                                        >
                                          <span>{subItem.title}</span>
                                        </button>
                                      </SidebarMenuItem>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <SidebarMenuItem>
                                <button
                                  onClick={() => navigate(item.url)}
                                  className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 h-8 text-sm ${getNavClass(item.url)}`}
                                >
                                  <item.icon className="h-4 w-4" />
                                  <span className="text-sm">{item.title}</span>
                                </button>
                              </SidebarMenuItem>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </SidebarMenu>
                )}

                {/* Asset Management Expandable Section */}
                {group.expandable && group.title === 'Asset Management' && (
                  <SidebarMenu className="px-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => toggleGroup('Asset Management')}
                        className="cursor-pointer hover:bg-sidebar-accent/50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {!collapsed && <span>Asset Management</span>}
                          </div>
                          {!collapsed && (
                            expandedGroups.has('Asset Management') ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {!collapsed && (
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedGroups.has('Asset Management') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink 
                                to={item.url}
                                className={getNavClass(item.url)}
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="text-sm">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    )}
                  </SidebarMenu>
                )}

                {/* Companies Expandable Section */}
                {group.expandable && group.title === 'Companies' && hasPermission(user?.appUser, 'Companies', 'view') && (
                  <SidebarMenu className="px-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        onClick={() => toggleGroup('Companies')}
                        className="cursor-pointer hover:bg-sidebar-accent/50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {!collapsed && <span>Companies</span>}
                          </div>
                          {!collapsed && (
                            expandedGroups.has('Companies') ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {/* Companies Sub-items */}
                    {!collapsed && (
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedGroups.has('Companies') ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            onClick={() => setIsAddGroupOpen(true)}
                            className="cursor-pointer hover:bg-sidebar-accent/50"
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            <span className="text-sm">Add Group</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {groups.map((group) => (
                          <SidebarMenuItem key={group.id}>
                            <SidebarMenuButton asChild>
                              <NavLink 
                                to={`/admin/company-group/${group.name}`}
                                className={getNavClass(`/admin/company-group/${group.name}`)}
                              >
                                <span className="text-sm">{group.name}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    )}
                  </SidebarMenu>
                )}


              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4 text-center text-sidebar-foreground/70">
                {!collapsed && <span>No menu items available</span>}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </div>
        
        {/* Profile Card - Fixed at Bottom */}
        <div className="border-t border-sidebar-border p-2 md:p-3 mt-auto bg-sidebar">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Avatar */}
            <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
              <AvatarImage src="/avatars/admin.png" alt={user?.appUser?.name || user?.user_metadata?.full_name || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                {(user?.appUser?.name || user?.user_metadata?.full_name || user?.email || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* User Info - Only show when expanded */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-sidebar-foreground truncate">
                  {user?.appUser?.name || user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-[10px] md:text-xs text-sidebar-foreground/60 truncate">
                  {user?.appUser?.email || user?.email}
                </p>
              </div>
            )}
            
            {/* Action Buttons - Only show when expanded */}
            {!collapsed && (
              <div className="flex gap-1 flex-shrink-0">
                {role === 'Tenant' && (
                  <NavLink 
                    to="/tenant/profile"
                    className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md transition-colors hover:bg-sidebar-accent ${getNavClass('/tenant/profile')}`}
                    title="Profile"
                  >
                    <UserCircle className="h-3 w-3 md:h-4 md:w-4" />
                  </NavLink>
                )}
                {hasPermission(user?.appUser, 'Settings', 'view') && (
                  <NavLink 
                    to="/admin/settings"
                    className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md transition-colors hover:bg-sidebar-accent ${getNavClass('/admin/settings')}`}
                    title="Settings"
                  >
                    <Settings className="h-3 w-3 md:h-4 md:w-4" />
                  </NavLink>
                )}
                <button
                  className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md transition-colors hover:bg-sidebar-accent text-destructive"
                  title="Logout"
                  onClick={async () => {
                    const { logout } = await import('@/contexts/AuthContext');
                    window.location.href = '/auth';
                  }}
                >
                  <LogOut className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
      
      {/* Add Group Dialog */}
      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Enter group name to add to Companies
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Tech Companies"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setGroupName('');
                setIsAddGroupOpen(false);
              }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Circular Group Dialog */}
      <Dialog open={isAddCircularGroupOpen} onOpenChange={setIsAddCircularGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Enter group name to add to Rathinam Circular View
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCircularGroup} className="space-y-4">
            <div>
              <Label htmlFor="circularGroupName">Group Name *</Label>
              <Input
                id="circularGroupName"
                value={circularGroupName}
                onChange={(e) => setCircularGroupName(e.target.value)}
                placeholder="e.g., SPAN3"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setCircularGroupName('');
                setIsAddCircularGroupOpen(false);
              }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <SidebarRail className="hidden" />
    </Sidebar>
  );
}