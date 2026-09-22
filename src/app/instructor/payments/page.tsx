import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInstructorAuth } from "@/context/InstructorAuthContext";
import { useToast } from "@/hooks/use-toast";
import { getInstructorOrders } from "@/lib/queries";
import { approveOrder, deleteOrder } from "@/lib/actions";
import { LoadingSpinner } from "@/components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Clock, CheckCircle, XCircle, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 50;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "পেন্ডিং", variant: "secondary", icon: Clock },
  approved: { label: "কনফার্মড", variant: "default", icon: CheckCircle },
  rejected: { label: "বাতিল", variant: "destructive", icon: XCircle },
};

const PAYMENT_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};

export default function InstructorPaymentsPage() {
  const { instructor } = useInstructorAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Approve modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [approveNotes, setApproveNotes] = useState("");

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["instructor-orders", instructor?.uid],
    queryFn: () => getInstructorOrders(instructor!.uid),
    enabled: !!instructor?.uid,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, amount, notes }: { id: string; amount?: number; notes?: string }) =>
      approveOrder(id, amount, notes),
    onMutate: ({ id }) => setProcessingId(id),
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast({ title: "কনফার্মড", description: "পেমেন্ট সফলভাবে কনফার্ম হয়েছে।" });
      queryClient.invalidateQueries({ queryKey: ["instructor-orders"] });
    },
    onError: (err: any) => {
      toast({ title: "সমস্যা", description: err.message || "কনফার্ম করতে সমস্যা হয়েছে।", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onMutate: (id) => setProcessingId(id),
    onSettled: () => setProcessingId(null),
    onSuccess: () => {
      toast({ title: "ডিলিট হয়েছে", description: "অর্ডার সফলভাবে ডিলিট হয়েছে।" });
      queryClient.invalidateQueries({ queryKey: ["instructor-orders"] });
    },
    onError: (err: any) => {
      toast({ title: "সমস্যা", description: err.message || "ডিলিট করতে সমস্যা হয়েছে।", variant: "destructive" });
    },
  });

  const openApproveModal = (order: any) => {
    setSelectedOrder(order);
    setApproveAmount(String(order.amount));
    setApproveNotes("");
    setApproveModalOpen(true);
  };

  const handleApproveConfirm = () => {
    if (!selectedOrder) return;
    const amountNum = parseFloat(approveAmount);
    approveMutation.mutate({
      id: selectedOrder.id,
      amount: isNaN(amountNum) ? selectedOrder.amount : amountNum,
      notes: approveNotes,
    });
    setApproveModalOpen(false);
    setSelectedOrder(null);
  };

  if (isLoading) {
    return <LoadingSpinner message="পেমেন্ট তথ্য লোড হচ্ছে..." />;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <p>পেমেন্ট তথ্য আনতে সমস্যা হয়েছে: {message}</p>;
  }

  const pendingOrders = orders.filter((o: any) => o.status === "pending");
  const approvedOrders = orders.filter((o: any) => o.status === "approved");
  const totalAmount = approvedOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold">পেমেন্টস</h2>
        <p className="text-muted-foreground mt-1">আপনার কোর্সগুলোর পেমেন্ট তথ্য দেখুন।</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">মোট অর্ডার</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <Clock className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-sm text-muted-foreground">পেন্ডিং</p>
            <p className="text-2xl font-bold">{pendingOrders.length}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm text-muted-foreground">মোট আয়</p>
            <p className="text-2xl font-bold">৳{totalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">সকল অর্ডার</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">কোনো অর্ডার পাওয়া যায়নি।</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>কোর্স</TableHead>
                      <TableHead>শিক্ষার্থী</TableHead>
                      <TableHead>পরিমাণ</TableHead>
                      <TableHead>মাধ্যম</TableHead>
                      <TableHead>নম্বর</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead>নোট</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order: any) => {
                      const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.courses?.title || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.study_user?.name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{order.study_user?.email || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">৳{order.amount}</TableCell>
                          <TableCell>
                            {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{order.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={order.notes || ""}>
                            {order.notes || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("bn-BD")}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.status === "pending" && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                  disabled={processingId === order.id}
                                  onClick={() => openApproveModal(order)}
                                >
                                  {processingId === order.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  )}
                                  কনফার্ম
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 gap-1"
                                  disabled={processingId === order.id}
                                  onClick={() => deleteMutation.mutate(order.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {paginatedOrders.map((order: any) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border bg-background p-4 space-y-3"
                    >
                      {/* Header: Course + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm leading-tight">{order.courses?.title || "N/A"}</p>
                        <Badge variant={statusConfig.variant} className="gap-1 shrink-0 text-[10px]">
                          <StatusIcon className="h-2.5 w-2.5" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {/* Student */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{order.study_user?.name || "N/A"}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground truncate">{order.study_user?.email || ""}</p>
                      </div>

                      {/* Amount + Method + Date */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-primary">৳{order.amount}</span>
                        <div className="text-right">
                          <p className="text-xs font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("bn-BD")}
                          </p>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">নম্বর</p>
                        <p className="font-mono text-xs font-medium">{order.phone_number}</p>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="bg-muted/50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">নোট</p>
                          <p className="text-xs font-medium">{order.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {order.status === "pending" && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 h-9 gap-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={processingId === order.id}
                            onClick={() => openApproveModal(order)}
                          >
                            {processingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            কনফার্ম করুন
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-9 gap-1"
                            disabled={processingId === order.id}
                            onClick={() => deleteMutation.mutate(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            ডিলিট
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    মোট {orders.length} টি অর্ডার, পৃষ্ঠা {currentPage} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .reduce<(number | "...")[]>((acc, page, idx, arr) => {
                        if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((page, idx) =>
                        page === "..." ? (
                          <span key={`ellipsis-${idx}`} className="text-muted-foreground px-1">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page as number)}
                          >
                            {page}
                          </Button>
                        ),
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>পেমেন্ট কনফার্ম করুন</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <span>
                  <strong>{selectedOrder.study_user?.name}</strong> - {selectedOrder.courses?.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">পরিমাণ (টাকা)</label>
              <Input
                type="number"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="পরিমাণ লিখুন"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">নোট (ঐচ্ছিক)</label>
              <Textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="কোনো নোট লিখতে চাইলে লিখুন..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApproveModalOpen(false)}
              disabled={processingId === selectedOrder?.id}
            >
              বাতিল
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={processingId === selectedOrder?.id}
              onClick={handleApproveConfirm}
            >
              {processingId === selectedOrder?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              কনফার্ম করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
