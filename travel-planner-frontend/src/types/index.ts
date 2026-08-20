export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  estimatedCost: number;
}

export interface ItineraryDay {
  day: number;
  city: string;
  theme: string;
  activities: Activity[];
}

export interface Itinerary {
  summary: string;
  totalEstimatedBudget: number;
  currency: string;
  travelTips: string[];
  days: ItineraryDay[];
}

export interface ItinerarySource {
  country: string;
  page: number;
  source: string;
}

export type TripStatus = "planning" | "completed" | "cancelled";

export interface TripHotel {
  name?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  price?: number;
  currency?: string;
  confirmationNumber?: string;
  photoUrl?: string;
}

export interface TripFlight {
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
}

export interface AirportSuggestion {
  iata: string;
  name: string;
  city: string | null;
  country: string;
}

export interface HotelSearchResult {
  hotelName: string;
  rating: number | null;
  reviewCount: number | null;
  stars: number | null;
  price: number | null;
  currency: string;
  checkInDate: string;
  checkOutDate: string;
  photoUrl: string | null;
  // Only present when the search fell back to AI suggestions (see
  // HotelSearchResponse.source) — no live inventory/pricing backs these.
  area?: string | null;
  priceTier?: string | null;
  reason?: string | null;
  // true when `rating` is the model's estimate rather than a real
  // aggregated guest score (photoUrl, when present, is always a verified
  // Wikipedia/Commons image either way — never fabricated).
  ratingIsEstimate?: boolean;
}

export interface RestaurantSearchResult {
  name: string;
  address: string | null;
  categories: string[];
  // Neighborhood/area — only ever set when source is "ai" (a real Foursquare
  // result has `address` instead).
  area?: string | null;
  rating: number | null;
  // Foursquare's free tier has no real rating/price data, so this is always
  // true when `rating` is present — an AI estimate, on a 1-5 scale.
  ratingIsEstimate?: boolean;
  priceTier: string | null;
  reason: string | null;
}

export interface RestaurantSearchResponse {
  restaurants: RestaurantSearchResult[];
  // "live" = real Foursquare venues (name/address/categories), rating/price
  // AI-estimated. "ai" = Foursquare itself was unavailable, so the venues
  // are AI-suggested too.
  source: "live" | "ai";
}

export interface HotelSearchResponse {
  hotels: HotelSearchResult[];
  // "live" = real Booking.com inventory/pricing. "ai" = the external hotel
  // API's quota was exhausted/rate-limited, so these are AI-suggested places
  // to stay instead — no real price/rating/photo, shown differently in the UI.
  source: "live" | "ai";
}

export interface Trip {
  _id: string;
  user: string;
  destination: string;
  budget: number;
  travelers: number;
  interests: string[];
  startDate: string;
  endDate: string;
  itinerary: Itinerary | null;
  itineraryGrounded: boolean | null;
  hotel: TripHotel | null;
  flights: TripFlight[];
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewTripInput {
  destination: string;
  budget: number;
  travelers: number;
  interests: string[];
  startDate: string;
  endDate: string;
  hotel?: TripHotel | null;
  flights?: TripFlight[];
}

export interface GenerateItineraryResult {
  itinerary: Itinerary;
  grounded: boolean;
  sources: ItinerarySource[];
}

export type PostType = "story" | "review" | "question" | "itinerary";
export type TravelType = "solo" | "family" | "couple" | "friends";

export interface PostAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ReviewDetails {
  budget?: number;
  bestTimeToVisit?: string;
  pros: string[];
  cons: string[];
}

export interface Post {
  _id: string;
  user: PostAuthor;
  type: PostType;
  content: string;
  images: string[];
  destination: string | null;
  travelType: TravelType | null;
  visitedDate: string | null;
  rating: number | null;
  review: ReviewDetails | null;
  trip: string | null;
  itinerarySnapshot: Itinerary | null;
  likeCount: number;
  likedByMe: boolean;
  saveCount: number;
  savedByMe: boolean;
  commentCount: number;
  bestAnswerComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewPostInput {
  type: "story" | "review" | "question";
  content: string;
  images?: string[];
  destination?: string;
  travelType?: TravelType;
  visitedDate?: string;
  rating?: number;
  review?: ReviewDetails;
}

export interface Comment {
  _id: string;
  post: string;
  user: PostAuthor;
  content: string;
  upvoteCount: number;
  upvotedByMe: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  bio: string;
  avatar: string | null;
  countriesVisited: string[];
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isOwnProfile: boolean;
}

export interface TrendingDestination {
  destination: string;
  reason: string;
}

export interface TopTraveler {
  id: string;
  name: string;
  avatar: string | null;
  countriesCount: number;
  postCount: number;
}

export interface TravelEvent {
  name: string;
  date: string | null;
  endDate: string | null;
  time: string | null;
  venue: string | null;
  country: string | null;
  category: string | null;
  url: string | null;
}

export interface EventDetails {
  found: boolean;
  title: string;
  extract: string | null;
  imageUrl: string | null;
  wikipediaUrl: string | null;
}

export interface DestinationGuide {
  destination: string;
  imageUrl: string | null;
  tagline: string;
  summary: string;
  highlights: string[];
  bestTimeToVisit: string;
  thingsToDo: string[];
  localTips: string[];
  estimatedDailyBudget: string;
}

export interface QuizRecommendation {
  destination: string;
  reason: string;
  matchTags: string[];
  imageUrl: string | null;
}

export interface AISuggestion {
  destination: string;
  blurb: string;
  icon: string;
  imageUrl: string | null;
}

export interface ChatUser {
  id: string;
  name: string;
  avatar: string | null;
}

export type ChatAttachmentType = "image" | "file";

export interface ChatAttachment {
  url: string;
  type: ChatAttachmentType;
  name: string;
  mimeType: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  attachment: ChatAttachment | null;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
}

export interface ConversationParticipant extends ChatUser {
  lastReadAt: string | null;
}

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "upvote"
  | "best_answer"
  | "itinerary_ready"
  | "itinerary_updated"
  | "trip_reminder";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  link: string;
  actor: ChatUser | null;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUser: ConversationParticipant | null;
  lastMessage: { text: string | null; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

