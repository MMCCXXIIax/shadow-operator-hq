import { useState } from "react";
import { useListLeads, getListLeadsQueryKey } from "@workspace/api-client-react";
import { NICHES } from "@/lib/niches";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Leads() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");

  const queryParams: any = {};
  if (search) queryParams.search = search;
  if (statusFilter !== "all") queryParams.dmStatus = statusFilter;
  if (nicheFilter !== "all") queryParams.niche = nicheFilter;

  const { data: leads, isLoading } = useListLeads(queryParams, { 
    query: { queryKey: getListLeadsQueryKey(queryParams) } 
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Interested": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "Replied": return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
      case "Sent": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      case "Not Interested": return "bg-red-500/15 text-red-700 dark:text-red-400";
      default: return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Pipeline</h1>
          <p className="text-muted-foreground">Manage and track your creator outreach</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search handles, niches, bios..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Not Sent">Not Sent</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Replied">Replied</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Not Interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={nicheFilter} onValueChange={setNicheFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Niche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Niches</SelectItem>
              {NICHES.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Handle</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Call</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : leads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No leads found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              leads?.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation(`/leads/${lead.id}`)}
                >
                  <TableCell className="font-medium">{lead.instagramHandle}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{lead.niche}</span>
                      <span className="text-xs text-muted-foreground">{lead.subNiche}</span>
                    </div>
                  </TableCell>
                  <TableCell>{lead.estFollowers}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-0 font-medium ${getStatusColor(lead.dmStatus)}`}>
                      {lead.dmStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className={`font-semibold ${lead.priorityScore >= 8 ? 'text-primary' : ''}`}>
                        {lead.priorityScore}
                      </span>
                      <span className="text-muted-foreground text-xs">/10</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {lead.callBooked === 'Yes' ? (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
