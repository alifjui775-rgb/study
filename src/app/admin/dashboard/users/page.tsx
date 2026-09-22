import type { User } from "@/lib/types";
import { UsersClient } from "./UsersClient";
import { Card, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { useSearchParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminUsers } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components";

const USERS_PER_PAGE = 20;

export default function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchTerm = searchParams.get("search") || "";

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-users", currentPage, searchTerm],
    queryFn: () => getAdminUsers(currentPage, searchTerm, USERS_PER_PAGE),
  });

  if (isLoading) {
    return <LoadingSpinner message="তথ্য লোড হচ্ছে..." />;
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return <p>তথ্য আনতে সমস্যা হয়েছে: {message}</p>;
  }

  const users = usersData?.users || [];
  const totalUsers = usersData?.count || 0;
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <Link
          key={i}
          to={`/admin/dashboard/users?page=${i}${searchTerm ? `&search=${searchTerm}` : ""}`}
          className={cn(
            buttonVariants({
              variant: i === currentPage ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          {i}
        </Link>,
      );
    }
    return pageNumbers;
  };

  return (
    <>
      <UsersClient initialUsers={users} />
      {totalPages > 1 && (
        <>
          <Card className="mt-2">
            <CardFooter className="flex items-center justify-center p-6">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-sm text-muted-foreground">
                  পৃষ্ঠা {currentPage} এর {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={
                      currentPage > 1
                        ? `/admin/dashboard/users?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ""}`
                        : "#"
                    }
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      currentPage <= 1 && "pointer-events-none opacity-50",
                    )}
                    aria-disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    আগের
                  </Link>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {renderPageNumbers()}
                  </div>
                  <Link
                    to={
                      currentPage < totalPages
                        ? `/admin/dashboard/users?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ""}`
                        : "#"
                    }
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      currentPage >= totalPages && "pointer-events-none opacity-50",
                    )}
                    aria-disabled={currentPage >= totalPages}
                  >
                    পরবর্তী
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </CardFooter>
          </Card>
          <hr className="h-8 border-transparent" />
        </>
      )}
    </>
  );
}
