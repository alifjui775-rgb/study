import { supabase } from "./supabase";
import { sanitizeFileUrl } from "./utils";

// Helper to revalidate after mutations (placeholder - React Query handles cache invalidation)
function revalidatePath(_path: string) {
  // In Vite SPA, cache is managed by React Query's invalidateQueries
  // This function is kept for compatibility but does nothing
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const roll = formData.get("roll") as string;

  // 1. Generate a random 8-digit password
  const newPassword = Math.random().toString(36).slice(-8);

  // 2. Insert the new user
  const { data, error } = await supabase
    .from("users")
    .insert([{ name, roll, pass: newPassword, enrolled_batches: [] }])
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  // 3. Return user data with the generated password
  return {
    success: true,
    message: "User created successfully",
    data: { ...data, pass: newPassword },
  };
}

export async function updateUser(formData: FormData) {
  const uid = formData.get("uid") as string;
  const name = formData.get("name") as string;
  const roll = formData.get("roll") as string;
  const pass = formData.get("pass") as string;

  const { data, error } = await supabase
    .from("users")
    .update({ name, roll, pass })
    .eq("uid", uid)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  return {
    success: true,
    data,
  };
}

export async function deleteUser(formData: FormData) {
  const uid = formData.get("uid") as string;

  const { error } = await supabase.from("users").delete().eq("uid", uid);

  if (error) {
    return {
      success: false,
      message: "Failed to delete user: " + error.message,
    };
  }

  revalidatePath("/admin/dashboard/users");

  return {
    success: true,
    message: "User deleted successfully",
  };
}

export async function createExam(formData: FormData) {
  const name = formData.get("name") as string;
  const batch_id_raw = formData.get("batch_id") as string | null;
  const course_id = formData.get("course_id") as string | null;
  const batch_id = course_id || (batch_id_raw === "public" ? null : batch_id_raw);

  const section_id = formData.get("section_id") as string | null;
  const subsection_id = formData.get("subsection_id") as string | null;

  const durationRaw = formData.get("duration_minutes") as string;
  const duration_minutes = durationRaw ? parseInt(durationRaw, 10) : null;
  const marks_per_question = parseFloat(formData.get("marks_per_question") as string);
  const negative_marks_per_wrong = parseFloat(formData.get("negative_marks_per_wrong") as string);
  const exam_type = (formData.get("exam_type") as string) || null;
  const is_practice = formData.get("is_practice") === "true";
  const shuffle_questions = formData.get("shuffle_questions") === "true";
  const shuffle_sections_only = formData.get("shuffle_sections_only") === "true";
  let start_at = formData.get("start_at") as string | null;
  let end_at = formData.get("end_at") as string | null;
  const sequenceOrderRaw = formData.get("sequence_order") as string;
  const sequence_order = sequenceOrderRaw ? parseInt(sequenceOrderRaw, 10) : 0;

  if (is_practice) {
    start_at = null;
    end_at = null;
  }

  const total_subjects_raw = formData.get("total_subjects") as string;
  const total_subjects = total_subjects_raw ? parseInt(total_subjects_raw, 10) : null;
  const mandatory_subjects = formData.getAll("mandatory_subjects") as string[];
  const optional_subjects = formData.getAll("optional_subjects") as string[];

  const { data, error } = await supabase
    .from("exams")
    .insert([
      {
        name,
        course_id: batch_id,
        section_id,
        subsection_id,
        duration_minutes,
        marks_per_question,
        negative_marks_per_wrong,
        exam_type,
        is_practice: is_practice || false,
        shuffle_questions,
        shuffle_sections_only,
        start_at,
        end_at,
        total_subjects,
        mandatory_subjects: mandatory_subjects.length > 0 ? mandatory_subjects : null,
        optional_subjects: optional_subjects.length > 0 ? optional_subjects : null,
        sequence_order,
      },
    ])
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to create exam: " + error.message,
    };
  }

  if (batch_id) {
    revalidatePath(`/admin/dashboard/batches/\${batch_id}`);
  } else {
    revalidatePath("/instructor/courses");
  }

  return {
    success: true,
    message: "Exam created successfully",
    data,
  };
}

export async function deleteExam(formData: FormData) {
  const id = formData.get("id") as string;
  const batch_id = formData.get("batch_id") as string | null;

  const { error } = await supabase
    .from("exams")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to delete exam: " + error.message,
    };
  }

  if (batch_id) {
    revalidatePath(`/admin/dashboard/batches/\${batch_id}`);
  } else {
    revalidatePath("/instructor/courses");
  }

  return {
    success: true,
    message: "Exam deleted successfully",
  };
}

// ========================
// EXAM QUESTIONS JUNCTION TABLE ACTIONS
// ========================

export async function addQuestionToExam(examId: string, questionId: string, examType: string) {
  // Determine the correct FK column based on exam type
  const fkColumn = examType === "written" ? "written_id" : examType === "cq" ? "cq_id" : "mcq_id";

  // Get next sequence_order
  const { data: maxRow } = await supabase
    .from("exam_questions")
    .select("sequence_order")
    .eq("exam_id", examId)
    .order("sequence_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sequence_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("exam_questions")
    .insert([
      {
        exam_id: examId,
        [fkColumn]: questionId,
        sequence_order: nextOrder,
      },
    ])
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to add question: " + error.message,
    };
  }

  return { success: true, data };
}

export async function removeQuestionFromExam(examId: string, questionId: string, examType: string) {
  const fkColumn = examType === "written" ? "written_id" : examType === "cq" ? "cq_id" : "mcq_id";

  const { error } = await supabase
    .from("exam_questions")
    .delete()
    .eq("exam_id", examId)
    .eq(fkColumn, questionId);

  if (error) {
    return {
      success: false,
      message: "Failed to remove question: " + error.message,
    };
  }

  return { success: true };
}

export async function updateExam(formData: FormData) {
  const id = formData.get("id") as string;
  const batch_id_raw = formData.get("batch_id") as string;
  const name = formData.get("name") as string;

  const course_id = formData.get("course_id") as string | null;
  const batch_id = course_id || batch_id_raw;

  const section_id = formData.get("section_id") as string | null;
  const subsection_id = formData.get("subsection_id") as string | null;

  const durationRaw = formData.get("duration_minutes") as string;
  const duration_minutes = parseInt(durationRaw, 10);
  const marks_per_question_raw = formData.get("marks_per_question") as string;
  const marks_per_question = marks_per_question_raw ? parseFloat(marks_per_question_raw) : null;
  const negative_marks_per_wrong = parseFloat(formData.get("negative_marks_per_wrong") as string);
  const exam_type = (formData.get("exam_type") as string) || null;
  const is_practice = formData.get("is_practice") === "true";
  const shuffle_questions = formData.get("shuffle_questions") === "true";
  const shuffle_sections_only = formData.get("shuffle_sections_only") === "true";
  let start_at = formData.get("start_at") as string | null;
  let end_at = formData.get("end_at") as string | null;
  const sequenceOrderRaw = formData.get("sequence_order") as string;
  const sequence_order = sequenceOrderRaw ? parseInt(sequenceOrderRaw, 10) : 0;

  if (is_practice) {
    start_at = null;
    end_at = null;
  }

  const total_subjects_raw = formData.get("total_subjects") as string;
  const total_subjects = total_subjects_raw ? parseInt(total_subjects_raw, 10) : null;
  const mandatory_subjects = formData.getAll("mandatory_subjects") as string[];
  const optional_subjects = formData.getAll("optional_subjects") as string[];

  const { data, error } = await supabase
    .from("exams")
    .update({
      name,
      course_id: batch_id,
      section_id,
      subsection_id,
      duration_minutes: isNaN(duration_minutes) ? null : duration_minutes,
      marks_per_question,
      negative_marks_per_wrong,
      exam_type,
      is_practice: is_practice || false,
      shuffle_questions,
      shuffle_sections_only,
      start_at: start_at,
      end_at: end_at,
      total_subjects,
      mandatory_subjects: mandatory_subjects.length > 0 ? mandatory_subjects : [],
      optional_subjects: optional_subjects.length > 0 ? optional_subjects : [],
      sequence_order,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update exam: " + error.message,
    };
  }

  const revalidatePathString = `/admin/dashboard/batches/${batch_id}`;
  revalidatePath(revalidatePathString);
  revalidatePath("/instructor/courses");

  return {
    success: true,
    data,
  };
}

export async function createCourse(formData: FormData) {
  const admin_id = formData.get("admin_id") as string;
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const short_description = formData.get("short_description") as string;
  const price_regular = parseFloat(formData.get("price_regular") as string);
  const discountRaw = formData.get("price_discounted");
  const price_discounted =
    discountRaw !== null && discountRaw !== "" && discountRaw !== undefined
      ? Number(discountRaw)
      : null;
  const status = formData.get("status") as "draft" | "published" | "archived";
  const cover_url = formData.get("cover_url") as string;
  const youtube_url = formData.get("youtube_url") as string;
  const routine_url = formData.get("routine_url") as string;
  const details = formData.get("details") as string;

  const discount_ends_at = (formData.get("discount_ends_at") as string) || null;
  const discount_max_limit = parseInt(formData.get("discount_max_limit") as string) || null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;
  const validity_days = parseInt(formData.get("validity_days") as string) || null;

  const features_raw = formData.get("features") as string;
  const features = features_raw ? features_raw.split("\n").filter((i) => i.trim() !== "") : [];

  const batch_ids = formData.getAll("batch_ids") as string[];
  const category_ids = formData.getAll("category_ids") as string[];

  const attendance = formData.get("attendance") === "true";
  const task = formData.get("task") === "true";
  const group_study = formData.get("group_study") === "true";
  const battle = formData.get("battle") === "true";
  const custom_exam = formData.get("custom_exam") === "true";
  const group_link = (formData.get("group_link") as string) || null;

  const faq_raw = formData.get("faq") as string;
  let faq: { question: string; answer: string }[] = [];
  if (faq_raw) {
    try {
      faq = JSON.parse(faq_raw);
    } catch {
      faq = [];
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .insert([
      {
        admin_id,
        title,
        slug,
        short_description: short_description || null,
        price_regular: isNaN(price_regular) ? 0 : price_regular,
        price_discounted: isNaN(price_discounted as number) ? null : price_discounted,
        status: status || "draft",
        cover_url: cover_url || null,
        youtube_url: youtube_url || null,
        features,
        faq,
        batch_ids: batch_ids.length > 0 ? batch_ids : [],
        category_ids: category_ids.length > 0 ? category_ids : [],
        details: details || null,
        routine_url: routine_url || null,
        discount_ends_at,
        discount_max_limit,
        start_date,
        end_date,
        validity_days,
        attendance,
        task,
        group_study,
        battle,
        custom_exam,
        group_link,
      },
    ])
    .select();

  if (error) {
    return {
      success: false,
      message: "Failed to create course: " + error.message,
    };
  }

  revalidatePath("/instructor/courses");

  return {
    success: true,
    message: "Course created successfully",
    data: data[0],
  };
}

export async function createOrder(
  userId: string,
  courseId: string,
  amount: number,
): Promise<{ success: boolean; orderId?: string; exists?: boolean; phoneFilled?: boolean; message?: string }> {
  // Check if user already has a pending/approved order for this course
  const { data: existing } = await supabase
    .from("orders")
    .select("id, phone_number")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["pending", "approved"])
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const phoneFilled = !!(existing.phone_number && existing.phone_number.trim());
    return {
      success: true,
      orderId: existing.id,
      exists: true,
      phoneFilled,
    };
  }

  // Server-side discount limit check
  let finalAmount = amount;
  const { data: course } = await supabase
    .from("courses")
    .select("price_regular, price_discounted, discount_max_limit")
    .eq("id", courseId)
    .single();

  if (course?.discount_max_limit && course.price_discounted != null) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .in("status", ["pending", "approved"])
      .is("deleted_at", null);

    if ((count ?? 0) >= course.discount_max_limit) {
      finalAmount = course.price_regular;
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        user_id: userId,
        course_id: courseId,
        amount: finalAmount,
        payment_method: "bkash" as const,
        phone_number: "",
        status: "pending" as const,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, orderId: data.id };
}

export async function updateOrderPayment(
  orderId: string,
  paymentMethod: "bkash" | "nagad" | "rocket",
  phoneNumber: string,
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from("orders")
    .update({
      payment_method: paymentMethod,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function approveOrder(
  orderId: string,
  amount?: number,
  notes?: string,
): Promise<{ success: boolean; message?: string }> {
  // 1. Get order details
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("user_id, course_id")
    .eq("id", orderId)
    .eq("status", "pending")
    .single();

  if (fetchError || !order) {
    return { success: false, message: "অর্ডার খুঁজে পাওয়া যায়নি।" };
  }

  // 2. Update order status to approved
  const updateData: Record<string, any> = {
    status: "approved" as const,
    updated_at: new Date().toISOString(),
  };
  if (amount !== undefined) updateData.amount = amount;
  if (notes !== undefined) updateData.notes = notes || null;

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // 3. Enroll student (same as enrollFreeCourse)
  const { error: enrollError } = await supabase
    .from("enrollments")
    .insert([{ course_id: order.course_id, student_id: order.user_id, status: true }]);

  if (enrollError && enrollError.code !== "23505") {
    // 23505 = unique constraint (already enrolled), that's fine
    return { success: false, message: enrollError.message };
  }

  // 4. Update enrolled_batches in users
  const { data: user } = await supabase
    .from("users")
    .select("enrolled_batches")
    .eq("uid", order.user_id)
    .single();

  if (user) {
    const batches = user.enrolled_batches || [];
    if (!batches.includes(order.course_id)) {
      await supabase
        .from("users")
        .update({ enrolled_batches: [...batches, order.course_id] })
        .eq("uid", order.user_id);
    }
  }

  return { success: true };
}

export async function deleteOrder(
  orderId: string,
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from("orders")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function enrollFreeCourse(courseId: string, studentId: string) {
  // 1. insert into enrollments
  const { error: enrollError } = await supabase
    .from("enrollments")
    .insert([{ course_id: courseId, student_id: studentId, status: true }]);

  if (enrollError) {
    // If it's a unique constraint error, it means they are already enrolled
    if (enrollError.code === "23505") {
      // do nothing for the error, proceed to update enrolled_batches just in case
    } else {
      return { success: false, message: enrollError.message };
    }
  }

  // 2. update enrolled_batches in users
  const { data: user } = await supabase
    .from("users")
    .select("enrolled_batches")
    .eq("uid", studentId)
    .single();

  if (user) {
    const batches = user.enrolled_batches || [];
    if (!batches.includes(courseId)) {
      await supabase
        .from("users")
        .update({ enrolled_batches: [...batches, courseId] })
        .eq("uid", studentId);
    }
  }

  return { success: true };
}

export async function updateCourse(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const short_description = formData.get("short_description") as string;
  const price_regular = parseFloat(formData.get("price_regular") as string);
  const discountRaw = formData.get("price_discounted");
  const price_discounted =
    discountRaw !== null && discountRaw !== "" && discountRaw !== undefined
      ? Number(discountRaw)
      : null;
  const status = formData.get("status") as "draft" | "published" | "archived";
  const cover_url = formData.get("cover_url") as string;
  const youtube_url = formData.get("youtube_url") as string;
  const routine_url = formData.get("routine_url") as string;
  const details = formData.get("details") as string;

  const discount_ends_at = (formData.get("discount_ends_at") as string) || null;
  const discount_max_limit = parseInt(formData.get("discount_max_limit") as string) || null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;
  const validity_days = parseInt(formData.get("validity_days") as string) || null;

  const features_raw = formData.get("features") as string;
  const features = features_raw ? features_raw.split("\n").filter((i) => i.trim() !== "") : [];

  const batch_ids = formData.getAll("batch_ids") as string[];
  const category_ids = formData.getAll("category_ids") as string[];

  const attendance = formData.get("attendance") === "true";
  const task = formData.get("task") === "true";
  const group_study = formData.get("group_study") === "true";
  const battle = formData.get("battle") === "true";
  const custom_exam = formData.get("custom_exam") === "true";
  const group_link = (formData.get("group_link") as string) || null;

  const faq_raw = formData.get("faq") as string;
  let faq: { question: string; answer: string }[] = [];
  if (faq_raw) {
    try {
      faq = JSON.parse(faq_raw);
    } catch {
      faq = [];
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      title,
      slug,
      short_description: short_description || null,
      price_regular: isNaN(price_regular) ? 0 : price_regular,
      price_discounted: isNaN(price_discounted as number) ? null : price_discounted,
      status,
      cover_url: cover_url || null,
      youtube_url: youtube_url || null,
      features,
      faq,
      batch_ids: batch_ids.length > 0 ? batch_ids : [],
      category_ids: category_ids.length > 0 ? category_ids : [],
      details: details || null,
      routine_url: routine_url || null,
      discount_ends_at,
      discount_max_limit,
      start_date,
      end_date,
      validity_days,
      attendance,
      task,
      group_study,
      battle,
      custom_exam,
      group_link,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: "Failed to update course: " + error.message,
    };
  }

  revalidatePath("/instructor/courses");
  revalidatePath(`/instructor/courses/\${id}`);

  return {
    success: true,
    message: "Course updated successfully",
    data,
  };
}

export async function deleteCourse(formData: FormData) {
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Failed to delete course: " + error.message,
    };
  }

  revalidatePath("/instructor/courses");

  return {
    success: true,
    message: "Course deleted successfully",
  };
}

// ========================
// COURSE SECTIONS ACTIONS
// ========================

export async function createCourseSection(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_open = formData.get("is_open") === "true";

  const { data, error } = await supabase
    .from("sections")
    .insert([
      {
        course_id,
        title,
        description: description || null,
        sequence_order,
        is_open,
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Section created", data };
}

export async function updateCourseSection(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_open = formData.get("is_open") === "true";

  const { data, error } = await supabase
    .from("sections")
    .update({
      title,
      description: description || null,
      sequence_order,
      is_open,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Section updated", data };
}

export async function deleteCourseSection(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("sections")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Section deleted" };
}

// ========================
// COURSE SUBSECTIONS ACTIONS
// ========================

export async function createCourseSubsection(formData: FormData) {
  const section_id = formData.get("section_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_open = formData.get("is_open") === "true";

  const { data, error } = await supabase
    .from("subsections")
    .insert([
      {
        section_id,
        title,
        description: description || null,
        sequence_order,
        is_open,
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Subsection created", data };
}

export async function updateCourseSubsection(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_open = formData.get("is_open") === "true";

  const { data, error } = await supabase
    .from("subsections")
    .update({
      title,
      description: description || null,
      sequence_order,
      is_open,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Subsection updated", data };
}

export async function deleteCourseSubsection(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("subsections")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Subsection deleted" };
}

// ========================
// COURSE ITEMS ACTIONS (Instructions, Classes, Polls, Assignments)
// ========================

// --- INSTRUCTIONS ---
export async function createCourseInstruction(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const section_id = formData.get("section_id") as string;
  const subsection_id = formData.get("subsection_id") as string | null;
  const title = formData.get("title") as string;
  const details = formData.get("details") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_public = formData.get("is_public") === "true";

  const { data, error } = await supabase
    .from("instructions")
    .insert([{ course_id, section_id, subsection_id, title, details, sequence_order, is_public }])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Instruction created", data };
}

export async function updateCourseInstruction(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const details = formData.get("details") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_public = formData.get("is_public") === "true";

  const { data, error } = await supabase
    .from("instructions")
    .update({ title, details, sequence_order, is_public })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Instruction updated", data };
}

export async function deleteCourseInstruction(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("instructions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Instruction deleted" };
}

// --- CLASSES ---
export async function createCourseClass(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const section_id = formData.get("section_id") as string;
  const subsection_id = formData.get("subsection_id") as string | null;
  const title = formData.get("title") as string;
  const video_url = formData.get("video_url") as string | null;
  const notes = formData.get("notes") as string | null;
  const is_live = formData.get("is_live") === "true";
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("classes")
    .insert([{ course_id, section_id, subsection_id, title, video_url, notes, is_live, sequence_order }])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Class created", data };
}

export async function updateCourseClass(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const video_url = formData.get("video_url") as string | null;
  const notes = formData.get("notes") as string | null;
  const is_live = formData.get("is_live") === "true";
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("classes")
    .update({ title, video_url, notes, is_live, sequence_order })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Class updated", data };
}

export async function deleteCourseClass(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("classes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Class deleted" };
}

export async function reportQuestion(formData: FormData) {
  const questionId = formData.get("question_id") as string;
  const questionType = formData.get("question_type") as "mcq" | "written" | "cq";
  const studentId = formData.get("student_id") as string;
  const reason = formData.get("reason") as string;
  const reportImagesJson = formData.get("report_images") as string | null;

  if (!questionId || !questionType || !studentId) {
    return { success: false, message: "Missing required fields" };
  }

  const typeKey =
    questionType === "written" ? "written_id" : questionType === "cq" ? "cq_id" : "mcq_id";

  let reportImages: string[] = [];
  if (reportImagesJson) {
    try {
      reportImages = JSON.parse(reportImagesJson);
    } catch {
      reportImages = [];
    }
  }

  const insertData = {
    [typeKey]: questionId,
    student_id: studentId,
    reason: reason.trim() || null,
    report_images: reportImages.length > 0 ? reportImages : null,
  };

  const { error } = await supabase.from("questions_report").insert([insertData]);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "আপনার রিপোর্টটি সাবমিট হয়েছে" };
}

// --- POLLS ---
export async function createCoursePoll(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const section_id = formData.get("section_id") as string;
  const subsection_id = formData.get("subsection_id") as string | null;
  const title = formData.get("title") as string;
  const poll_system_id = formData.get("poll_system_id") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("polls")
    .insert([{ course_id, section_id, subsection_id, title, poll_system_id, sequence_order }])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Poll created", data };
}

export async function updateCoursePoll(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const poll_system_id = formData.get("poll_system_id") as string;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("polls")
    .update({ title, poll_system_id, sequence_order })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Poll updated", data };
}

export async function deleteCoursePoll(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("polls")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Poll deleted" };
}

// --- ASSIGNMENTS ---
export async function createCourseAssignment(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const section_id = formData.get("section_id") as string;
  const subsection_id = formData.get("subsection_id") as string | null;
  const title = formData.get("title") as string;
  const instructions_raw = formData.get("instructions") as string;
  const due_date = formData.get("due_date") as string | null;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("assignments")
    .insert([
      {
        course_id,
        section_id,
        subsection_id,
        title,
        instructions: instructions_raw ? JSON.parse(instructions_raw) : null,
        due_date,
        sequence_order,
      },
    ])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Assignment created", data };
}

export async function updateCourseAssignment(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const instructions_raw = formData.get("instructions") as string;
  const due_date = formData.get("due_date") as string | null;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;

  const { data, error } = await supabase
    .from("assignments")
    .update({
      title,
      instructions: instructions_raw ? JSON.parse(instructions_raw) : null,
      due_date,
      sequence_order,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Assignment updated", data };
}

// --- SETTINGS ---
export async function createCourseBatch(formData: FormData) {
  const name = formData.get("name") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const is_current = formData.get("is_current") === "true";
  const { data, error } = await supabase
    .from("batches")
    .insert([{ name, year, is_current }])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Batch created", data };
}

export async function updateCourseBatch(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const year = parseInt(formData.get("year") as string, 10);
  const is_current = formData.get("is_current") === "true";
  const { data, error } = await supabase
    .from("batches")
    .update({ name, year, is_current })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Batch updated", data };
}

export async function deleteCourseBatch(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Batch deleted" };
}

export async function createCourseCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const { data, error } = await supabase
    .from("course_categories")
    .insert([{ name }])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Category created", data };
}

export async function updateCourseCategory(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const { data, error } = await supabase
    .from("course_categories")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Category updated", data };
}

export async function deleteCourseCategory(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase.from("course_categories").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Category deleted" };
}

export async function deleteCourseAssignment(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("assignments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Assignment deleted" };
}

// --- FILES ---
export async function createCourseFile(formData: FormData) {
  const course_id = formData.get("course_id") as string;
  const section_id = formData.get("section_id") as string;
  const subsection_id = formData.get("subsection_id") as string | null;
  const title = formData.get("title") as string;
  const rawFileUrl = formData.get("file_url") as string;
  const file_url = sanitizeFileUrl(rawFileUrl);
  const description = formData.get("description") as string | null;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_public = formData.get("is_public") === "true";

  const { data, error } = await supabase
    .from("course_files")
    .insert([
      {
        course_id,
        section_id,
        subsection_id,
        title,
        file_url,
        description,
        sequence_order,
        is_public,
      },
    ])
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "File created", data };
}

export async function updateCourseFile(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const rawFileUrl = formData.get("file_url") as string;
  const file_url = sanitizeFileUrl(rawFileUrl);
  const description = formData.get("description") as string | null;
  const sequence_order = parseInt(formData.get("sequence_order") as string) || 0;
  const is_public = formData.get("is_public") === "true";

  const { data, error } = await supabase
    .from("course_files")
    .update({ title, file_url, description, sequence_order, is_public })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, message: error.message };
  return { success: true, message: "File updated", data };
}

export async function deleteCourseFile(formData: FormData) {
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("course_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "File deleted" };
}

// ========================
// EXAM SESSION ACTIONS (Two-Table Relational Schema)
// ========================

/**
 * Checks whether the student already has an 'ongoing' or 'submitted' entry
 * for this exam. If not, creates a new 'ongoing' row and returns its ID.
 * Always returns the student_exam_id so the frontend can link answers to it.
 */
export async function startOrGetStudentExam(
  examId: string,
  studentId: string,
): Promise<{
  success: boolean;
  studentExamId?: string;
  message?: string;
  alreadySubmitted?: boolean;
}> {
  const { data: existing, error: fetchError } = await supabase
    .from("student_exams")
    .select("id, status")
    .eq("exam_id", examId)
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return { success: false, message: "Failed to check existing session: " + fetchError.message };
  }

  if (existing) {
    return {
      success: true,
      studentExamId: existing.id,
      alreadySubmitted: existing.status === "submitted",
    };
  }

  const { data: newSession, error: insertError } = await supabase
    .from("student_exams")
    .insert({
      exam_id: examId,
      student_id: studentId,
      status: "ongoing",
    })
    .select("id")
    .single();

  if (insertError) {
    return { success: false, message: "Failed to start exam session: " + insertError.message };
  }

  return { success: true, studentExamId: newSession.id };
}

/**
 * UPSERTs a single answer into student_exam_answers.
 * Uses the unique constraint on (student_exam_id, mcq_id) to safely update.
 * If selectedOptionIds is empty, the row is deleted (user cleared selection).
 */
export async function autoSaveAnswer(
  studentExamId: string,
  studentId: string,
  mcqId: string,
  selectedOptionIds: string[],
  isCorrect: boolean,
): Promise<{ success: boolean; message?: string }> {
  if (selectedOptionIds.length === 0) {
    const { error } = await supabase
      .from("student_exam_answers")
      .delete()
      .eq("student_exam_id", studentExamId)
      .eq("mcq_id", mcqId);
    if (error) {
      return { success: false, message: "Failed to clear answer: " + error.message };
    }
    return { success: true };
  }

  const { error } = await supabase.from("student_exam_answers").upsert(
    {
      student_exam_id: studentExamId,
      student_id: studentId,
      mcq_id: mcqId,
      selected_options: selectedOptionIds,
      is_correct: isCorrect,
    },
    { onConflict: "student_exam_id,mcq_id" },
  );

  if (error) {
    return { success: false, message: "Failed to auto-save answer: " + error.message };
  }

  return { success: true };
}

/**
 * Finalises the exam by updating the student_exams summary row with the
 * calculated score and marking status as 'submitted'.
 */
export async function submitFinalExam(
  studentExamId: string,
  calculatedData: {
    score: number;
    correct_answers: number;
    wrong_answers: number;
    unattempted: number;
  },
): Promise<{ success: boolean; message?: string }> {
  const { error } = await supabase
    .from("student_exams")
    .update({
      score: calculatedData.score,
      correct_answers: calculatedData.correct_answers,
      wrong_answers: calculatedData.wrong_answers,
      unattempted: calculatedData.unattempted,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", studentExamId);

  if (error) {
    return { success: false, message: "Failed to submit exam: " + error.message };
  }

  return { success: true };
}
