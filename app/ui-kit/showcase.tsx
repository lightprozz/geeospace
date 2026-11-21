"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandDialog } from "@/components/ui/command";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { SortHeader } from "@/components/ui/sort-header";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useSort } from "@/hooks/use-sort";

function Example({ name, children }: { name: string; children: ReactNode }) {
  return <section data-primitive={name} className="space-y-3 rounded-xl border p-4"><h2 className="text-sm font-semibold">{name}</h2>{children}</section>;
}

export function UiKitShowcase({ theme, accent }: { theme: "light" | "dark"; accent: string }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { sortConfig, toggleSort } = useSort("ui-kit-sort", "name");
  return <div className="geeospace-os" data-theme={theme} style={{ position: "relative", overflow: "visible", minHeight: "100vh", "--os-accent": accent } as CSSProperties}>
    <header className="os-menubar"><strong>Geeospace · UI kit</strong><span>Unscoped OS chrome</span></header>
    <LmsUiScope className="bg-background text-foreground p-8 pt-20">
      <h1 className="mb-2 text-3xl font-semibold">LMS UI kit</h1><p className="mb-8 text-muted-foreground">Shared primitives · {theme} · accent-aware and portal-safe</p>
      <TooltipProvider><div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Example name="button"><div className="flex gap-2"><Button>Primary</Button><Button variant="outline">Outline</Button><Button disabled>Disabled</Button></div></Example>
        <Example name="badge"><Badge>Published</Badge></Example>
        <Example name="alert"><Alert><AlertTitle>Ready to teach</AlertTitle><AlertDescription>Your workspace is up to date.</AlertDescription></Alert></Example>
        <Example name="avatar"><Avatar><AvatarFallback>GO</AvatarFallback></Avatar></Example>
        <Example name="breadcrumb"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="#">LMS</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Courses</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></Example>
        <Example name="calendar"><Calendar mode="single" defaultMonth={new Date(2026, 4, 1)} /></Example>
        <Example name="card"><Card><CardHeader><CardTitle>Mathematics</CardTitle><CardDescription>12 lessons</CardDescription></CardHeader><CardContent>Continue learning.</CardContent></Card></Example>
        <Example name="checkbox"><Label><Checkbox defaultChecked /> Receive updates</Label></Example>
        <Example name="collapsible"><Collapsible defaultOpen><CollapsibleTrigger asChild><Button variant="outline">Course details</Button></CollapsibleTrigger><CollapsibleContent>Open enrollment for everyone.</CollapsibleContent></Collapsible></Example>
        <Example name="command"><Command className="h-auto"><CommandInput placeholder="Find course..." /><CommandList><CommandEmpty>No courses found.</CommandEmpty><CommandGroup heading="Courses"><CommandItem>Mathematics</CommandItem><CommandItem>Science</CommandItem></CommandGroup></CommandList></Command><Button variant="outline" onClick={() => setCommandOpen(true)}>Open command</Button><CommandDialog open={commandOpen} onOpenChange={setCommandOpen}><Command><CommandInput /><CommandList><CommandItem>Mathematics</CommandItem></CommandList></Command></CommandDialog></Example>
        <Example name="dialog"><Dialog><DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Course dialog</DialogTitle><DialogDescription>Portal content keeps the LMS theme.</DialogDescription></DialogHeader><Input aria-label="Course name" placeholder="Course name" /></DialogContent></Dialog></Example>
        <Example name="alert-dialog"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive">Archive course</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive course?</AlertDialogTitle><AlertDialogDescription>You can restore it later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></Example>
        <Example name="dropdown-menu"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Course actions</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Edit</DropdownMenuItem><DropdownMenuItem>Duplicate</DropdownMenuItem></DropdownMenuContent></DropdownMenu></Example>
        <Example name="field"><Field><FieldLabel htmlFor="kit-title">Title</FieldLabel><Input id="kit-title" placeholder="Lesson title" /><FieldDescription>Visible to students.</FieldDescription></Field></Example>
        <Example name="input-group"><InputGroup><InputGroupAddon>https://</InputGroupAddon><InputGroupInput aria-label="Website" placeholder="gee-o.vn" /></InputGroup></Example>
        <Example name="input"><Input aria-label="Search" placeholder="Search..." /><Input disabled placeholder="Disabled" /></Example>
        <Example name="label"><Label htmlFor="kit-notes">Course notes label</Label></Example>
        <Example name="popover"><Popover><PopoverTrigger asChild><Button variant="outline">Open popover</Button></PopoverTrigger><PopoverContent>Quick course preview</PopoverContent></Popover></Example>
        <Example name="progress"><Progress value={65} aria-label="Course progress" /></Example>
        <Example name="scroll-area"><ScrollArea className="h-24">{Array.from({ length: 12 }, (_, i) => <p key={i}>Lesson {i + 1}</p>)}</ScrollArea></Example>
        <Example name="select"><Select><SelectTrigger aria-label="Select course"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent><SelectItem value="math">Mathematics</SelectItem><SelectItem value="science">Science</SelectItem></SelectContent></Select></Example>
        <Example name="separator"><p>Teaching</p><Separator /><p>Learning</p></Example>
        <Example name="sheet"><Sheet><SheetTrigger asChild><Button variant="outline">Open sheet</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Course settings</SheetTitle><SheetDescription>Manage your course.</SheetDescription></SheetHeader></SheetContent></Sheet></Example>
        <Example name="sidebar"><SidebarProvider className="min-h-0"><Sidebar collapsible="none" className="w-full"><SidebarContent><SidebarGroup><SidebarGroupLabel>LMS</SidebarGroupLabel><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive>Courses</SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton>Students</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup></SidebarContent></Sidebar></SidebarProvider></Example>
        <Example name="skeleton"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></Example>
        <Example name="sonner"><Button variant="outline" onClick={() => toast.success("Course saved")}>Show toast</Button><Toaster /></Example>
        <Example name="sort-header"><SortHeader column="name" label="Course name" currentSort={sortConfig} onSort={toggleSort} /></Example>
        <Example name="spinner"><Spinner /></Example>
        <Example name="switch"><Label><Switch defaultChecked /> Published</Label></Example>
        <Example name="table"><Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Students</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Mathematics</TableCell><TableCell>24</TableCell></TableRow></TableBody></Table></Example>
        <Example name="tabs"><Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="lessons">Lessons</TabsTrigger></TabsList><TabsContent value="overview">Course overview</TabsContent><TabsContent value="lessons">12 lessons</TabsContent></Tabs></Example>
        <Example name="textarea"><Textarea id="kit-notes" placeholder="Write course notes..." /></Example>
        <Example name="tooltip"><Tooltip><TooltipTrigger asChild><Button variant="outline">Hover for help</Button></TooltipTrigger><TooltipContent>Helpful course tips</TooltipContent></Tooltip></Example>
      </div></TooltipProvider>
    </LmsUiScope>
  </div>;
}
