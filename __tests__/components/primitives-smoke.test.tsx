import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Smoke tests — each primitive renders without throwing and exposes its
// trigger/content surface. Deep interaction testing happens per-component
// later; this just confirms the Base UI imports resolved and the CLI-added
// files are wired correctly.
describe("new shadcn primitives render", () => {
  it("renders a Sheet trigger", () => {
    render(
      <Sheet>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent>content</SheetContent>
      </Sheet>
    );
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders a DropdownMenu trigger", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText("menu")).toBeInTheDocument();
  });

  it("renders an Avatar with a fallback", () => {
    render(
      <Avatar>
        <AvatarFallback>EB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("EB")).toBeInTheDocument();
  });

  it("renders a Table with a row", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Col</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>cell value</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText("cell value")).toBeInTheDocument();
  });

  it("renders a Tooltip trigger", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText("hover me")).toBeInTheDocument();
  });

  it("renders a Sidebar with a menu item", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Overview</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });
});
