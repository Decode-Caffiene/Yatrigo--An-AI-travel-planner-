import type {
  AISuggestion,
  AppNotification,
  ChatMessage,
  ChatUser,
  Comment,
  Conversation,
  DestinationGuide,
  EventDetails,
  GenerateItineraryResult,
  AirportSuggestion,
  HotelSearchResult,
  NewPostInput,
  NewTripInput,
  Post,
  QuizRecommendation,
  TopTraveler,
  TravelEvent,
  TrendingDestination,
  Trip,
  User,
  UserProfile,
} from "@/types";
import type { DestinationSuggestion } from "@/lib/destinations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface AuthResult {
  user: User;
  token: string;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || "Something went wrong. Please try again.",
      response.status
    );
  }

  return data as T;
}

export const registerUser = (name: string, email: string, password: string) =>
  request<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const loginUser = (email: string, password: string) =>
  request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const loginWithGoogle = (accessToken: string) =>
  request<AuthResult>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });

export const forgotPassword = (email: string) =>
  request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, password: string) =>
  request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export const verifyEmail = (token: string) =>
  request<AuthResult>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const resendVerification = (email: string) =>
  request<{ message: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const createTrip = (token: string, input: NewTripInput) =>
  request<{ trip: Trip }>("/trips", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const listTrips = (token: string) =>
  request<{ count: number; trips: Trip[] }>("/trips", { token });

export const getTrip = (token: string, tripId: string) =>
  request<{ trip: Trip }>(`/trips/${tripId}`, { token });

export const updateTrip = (
  token: string,
  tripId: string,
  input: Partial<
    NewTripInput & {
      hotel: Trip["hotel"];
      flights: Trip["flights"];
      status: Trip["status"];
    }
  >
) =>
  request<{ trip: Trip }>(`/trips/${tripId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const deleteTrip = (token: string, tripId: string) =>
  request<{ message: string }>(`/trips/${tripId}`, {
    method: "DELETE",
    token,
  });

export const searchHotels = (
  token: string,
  destination: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number
) =>
  request<{ hotels: HotelSearchResult[] }>(
    `/hotels/search?destination=${encodeURIComponent(destination)}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}`,
    { token }
  );

export const searchAirports = (token: string, query: string) =>
  request<{ airports: AirportSuggestion[] }>(
    `/flights/airports?query=${encodeURIComponent(query)}`,
    { token }
  );

export const generateItinerary = (token: string, tripId: string) =>
  request<GenerateItineraryResult>(`/trips/generate/${tripId}`, {
    method: "POST",
    token,
  });

export const regenerateItinerary = (token: string, tripId: string) =>
  request<GenerateItineraryResult>(`/trips/regenerate/${tripId}`, {
    method: "POST",
    token,
  });

export const uploadImage = async (token: string, file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("image", file);

  let response: Response;

  try {
    response = await fetch(`${API_URL}/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message || "Image upload failed.", response.status);
  }

  return data;
};

export interface ListPostsFilters {
  type?: string;
  following?: boolean;
  saved?: boolean;
  author?: string;
  before?: string;
}

export const listPosts = (token: string, filters: ListPostsFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.following) params.set("following", "true");
  if (filters.saved) params.set("saved", "true");
  if (filters.author) params.set("author", filters.author);
  if (filters.before) params.set("before", filters.before);

  const query = params.toString();
  return request<{ count: number; posts: Post[]; hasMore: boolean }>(
    `/community/posts${query ? `?${query}` : ""}`,
    { token }
  );
};

export const createPost = (token: string, input: NewPostInput) =>
  request<{ post: Post }>("/community/posts", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const getPost = (token: string, postId: string) =>
  request<{ post: Post; comments: Comment[] }>(`/community/posts/${postId}`, { token });

export const deletePost = (token: string, postId: string) =>
  request<{ message: string }>(`/community/posts/${postId}`, {
    method: "DELETE",
    token,
  });

export const toggleLike = (token: string, postId: string) =>
  request<{ post: Post }>(`/community/posts/${postId}/like`, {
    method: "POST",
    token,
  });

export const toggleSave = (token: string, postId: string) =>
  request<{ post: Post }>(`/community/posts/${postId}/save`, {
    method: "POST",
    token,
  });

export const addComment = (token: string, postId: string, content: string) =>
  request<{ comment: Comment }>(`/community/posts/${postId}/comments`, {
    method: "POST",
    token,
    body: JSON.stringify({ content }),
  });

export const toggleCommentUpvote = (token: string, postId: string, commentId: string) =>
  request<{ comment: Comment }>(
    `/community/posts/${postId}/comments/${commentId}/upvote`,
    { method: "POST", token }
  );

export const markBestAnswer = (token: string, postId: string, commentId: string) =>
  request<{ post: Post }>(`/community/posts/${postId}/best-answer`, {
    method: "POST",
    token,
    body: JSON.stringify({ commentId }),
  });

export const shareItineraryToCommunity = (token: string, tripId: string) =>
  request<{ post: Post }>(`/community/posts/itinerary/${tripId}`, {
    method: "POST",
    token,
  });

export const copyItineraryFromPost = (token: string, postId: string) =>
  request<{ trip: Trip }>(`/community/posts/${postId}/copy-itinerary`, {
    method: "POST",
    token,
  });

export const getTrendingDestinations = (token: string) =>
  request<{ destinations: TrendingDestination[] }>("/community/trending-destinations", {
    token,
  });

export const getTopTravelers = (token: string) =>
  request<{ travelers: TopTraveler[] }>("/community/top-travelers", { token });

export const getUserProfile = (token: string, userId: string) =>
  request<{ profile: UserProfile }>(`/users/${userId}`, { token });

export const updateProfile = (
  token: string,
  input: Partial<{ name: string; bio: string; avatar: string }>
) =>
  request<{ profile: UserProfile }>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });

export const followUser = (token: string, userId: string) =>
  request<{ isFollowedByMe: boolean; followerCount: number }>(
    `/users/${userId}/follow`,
    { method: "POST", token }
  );

export const getAIEvents = (token: string, destination: string) =>
  request<{ events: TravelEvent[] }>(
    `/events/ai?destination=${encodeURIComponent(destination)}`,
    { token }
  );

export const getUpcomingEvents = (token: string) =>
  request<{ events: TravelEvent[] }>("/events/upcoming", { token });

export const getEventDetails = (token: string, name: string, context?: string) =>
  request<{ event: EventDetails }>(
    `/events/details?name=${encodeURIComponent(name)}${
      context ? `&context=${encodeURIComponent(context)}` : ""
    }`,
    { token }
  );

export const getDestinationGuide = (token: string, destination: string) =>
  request<{ guide: DestinationGuide }>(
    `/destinations/guide?destination=${encodeURIComponent(destination)}`,
    { token }
  );

export const getDestinationImage = (token: string, destination: string) =>
  request<{ imageUrl: string | null }>(
    `/destinations/image?destination=${encodeURIComponent(destination)}`,
    { token }
  );

export const takeTravelQuiz = (token: string, answers: Record<string, string>) =>
  request<{ recommendations: QuizRecommendation[] }>("/destinations/quiz", {
    method: "POST",
    token,
    body: JSON.stringify({ answers }),
  });

export const getAISuggestions = (token: string) =>
  request<{ suggestions: AISuggestion[] }>("/destinations/ai-suggestions", { token });

export const searchPlaces = (token: string, query: string) =>
  request<{ places: DestinationSuggestion[] }>(
    `/maps/search?query=${encodeURIComponent(query)}`,
    { token }
  );

export const searchUsers = (token: string, query: string) =>
  request<{ users: ChatUser[] }>(
    `/users/search?query=${encodeURIComponent(query)}`,
    { token }
  );

export const listConversations = (token: string) =>
  request<{ conversations: Conversation[] }>("/messages/conversations", { token });

export const startConversation = (token: string, userId: string) =>
  request<{ conversation: Conversation }>("/messages/conversations", {
    method: "POST",
    token,
    body: JSON.stringify({ userId }),
  });

export const getMessages = (token: string, conversationId: string, before?: string) =>
  request<{ messages: ChatMessage[]; hasMore: boolean }>(
    `/messages/conversations/${conversationId}/messages${
      before ? `?before=${encodeURIComponent(before)}` : ""
    }`,
    { token }
  );

export const sendMessage = (token: string, conversationId: string, text: string) =>
  request<{ message: ChatMessage }>(
    `/messages/conversations/${conversationId}/messages`,
    { method: "POST", token, body: JSON.stringify({ text }) }
  );

export const deleteMessage = (token: string, conversationId: string, messageId: string) =>
  request<{ success: boolean }>(
    `/messages/conversations/${conversationId}/messages/${messageId}`,
    { method: "DELETE", token }
  );

export const markConversationRead = (token: string, conversationId: string) =>
  request<{ success: boolean }>(`/messages/conversations/${conversationId}/read`, {
    method: "POST",
    token,
  });

export const getUnreadMessageCount = (token: string) =>
  request<{ count: number }>("/messages/unread-count", { token });

export const listNotifications = (token: string) =>
  request<{ notifications: AppNotification[] }>("/notifications", { token });

export const markAllNotificationsRead = (token: string) =>
  request<{ success: boolean }>("/notifications/read-all", { method: "POST", token });

export const getUnreadNotificationCount = (token: string) =>
  request<{ count: number }>("/notifications/unread-count", { token });
