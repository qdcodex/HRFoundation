import "server-only";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./auth";

/* ---------- Website pages: hero text, SEO and (for legal pages) body, with draft → published ---------- */

export interface IPageContent {
  title: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
}
const PageContentSchema = new Schema<IPageContent>(
  {
    title: { type: String, default: "", maxlength: 200 },
    intro: { type: String, default: "", maxlength: 600 },
    seoTitle: { type: String, default: "", maxlength: 80 },
    seoDescription: { type: String, default: "", maxlength: 200 },
    body: { type: String, default: "", maxlength: 30000 },
  },
  { _id: false },
);

export interface ISitePage {
  _id: Types.ObjectId;
  key: string;
  path: string;
  label: string;
  hasBody: boolean;
  draft: IPageContent;
  published?: IPageContent | null;
  publishedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;
  updatedByName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
const SitePageSchema = new Schema<ISitePage>(
  {
    key: { type: String, required: true, unique: true },
    path: { type: String, required: true },
    label: { type: String, required: true },
    hasBody: { type: Boolean, default: false },
    draft: { type: PageContentSchema, required: true },
    published: { type: PageContentSchema, default: null },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    updatedByName: { type: String, default: null },
  },
  { timestamps: true },
);

/* ---------- Services ---------- */

export const SERVICE_STATUSES = ["registered-objective", "pending-confirmation", "proposed"] as const;

export interface IService {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  shortTitle: string;
  icon: "education" | "medical" | "community" | "membership";
  status: (typeof SERVICE_STATUSES)[number];
  published: boolean;
  order: number;
  summary: string;
  seoTitle?: string;
  metaDescription: string;
  overview: string[];
  objectives: string[];
  approvedActivities: { title: string; description: string }[];
  potentialInitiatives: string[];
  eligibility: string[];
  enquiry: string;
  imageId?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  updatedAt: Date;
  createdAt: Date;
}
const ServiceSchema = new Schema<IService>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 120 },
    shortTitle: { type: String, required: true, maxlength: 60 },
    icon: { type: String, enum: ["education", "medical", "community", "membership"], required: true },
    status: { type: String, enum: SERVICE_STATUSES, required: true },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    summary: { type: String, required: true, maxlength: 400 },
    seoTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, required: true, maxlength: 200 },
    overview: { type: [String], default: [] },
    objectives: { type: [String], default: [] },
    approvedActivities: { type: [{ title: String, description: String, _id: false }], default: [] },
    potentialInitiatives: { type: [String], default: [] },
    eligibility: { type: [String], default: [] },
    enquiry: { type: String, default: "", maxlength: 600 },
    imageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

/* ---------- Activities ---------- */

export interface IActivity {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  status: "planned" | "completed";
  serviceSlug?: string | null;
  mediaIds: Types.ObjectId[];
  published: boolean;
  publishedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const ActivitySchema = new Schema<IActivity>(
  {
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 4000 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    location: { type: String, maxlength: 160 },
    status: { type: String, enum: ["planned", "completed"], required: true },
    serviceSlug: { type: String, default: null },
    mediaIds: { type: [Schema.Types.ObjectId], ref: "Media", default: [] },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

/* ---------- News ---------- */

export interface INewsArticle {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: "Announcement" | "News" | "Notice";
  featuredImageId?: Types.ObjectId | null;
  publishDate: string;
  seoTitle?: string;
  seoDescription?: string;
  status: "draft" | "published";
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const NewsArticleSchema = new Schema<INewsArticle>(
  {
    slug: { type: String, required: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    title: { type: String, required: true, maxlength: 160 },
    summary: { type: String, required: true, maxlength: 400 },
    body: { type: String, default: "", maxlength: 30000 },
    category: { type: String, enum: ["Announcement", "News", "Notice"], default: "News" },
    featuredImageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    publishDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    seoTitle: { type: String, maxlength: 70 },
    seoDescription: { type: String, maxlength: 200 },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

/* ---------- Public documents ---------- */

export const DOCUMENT_CATEGORIES = ["registration", "tax", "governance", "reports"] as const;

export interface IPublicDocument {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: (typeof DOCUMENT_CATEGORIES)[number];
  docDate?: string;
  file?: { fileId: Types.ObjectId; name: string; size: number; mime: string } | null;
  visibility: "public" | "on_request";
  status: "draft" | "published";
  order: number;
  publishedBy?: Types.ObjectId | null;
  publishedAt?: Date | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const PublicDocumentSchema = new Schema<IPublicDocument>(
  {
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 600 },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    docDate: { type: String, maxlength: 40 },
    file: { type: { fileId: Schema.Types.ObjectId, name: String, size: Number, mime: String }, default: null },
    visibility: { type: String, enum: ["public", "on_request"], default: "on_request" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    order: { type: Number, default: 0 },
    publishedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true },
);

/* ---------- Media library (approved public images) ---------- */

export interface IMedia {
  _id: Types.ObjectId;
  fileId: Types.ObjectId;
  filename: string;
  mime: string;
  size: number;
  alt: string;
  uploadedBy: Types.ObjectId;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}
const MediaSchema = new Schema<IMedia>(
  {
    fileId: { type: Schema.Types.ObjectId, required: true, unique: true },
    filename: { type: String, required: true, maxlength: 200 },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    alt: { type: String, required: true, maxlength: 200 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    uploadedByName: { type: String, required: true },
  },
  { timestamps: true },
);

export const SitePage = defineModel<ISitePage>("SitePage", SitePageSchema);
export const Service = defineModel<IService>("Service", ServiceSchema);
export const Activity = defineModel<IActivity>("Activity", ActivitySchema);
export const NewsArticle = defineModel<INewsArticle>("NewsArticle", NewsArticleSchema);
export const PublicDocument = defineModel<IPublicDocument>("PublicDocument", PublicDocumentSchema);
export const Media = defineModel<IMedia>("Media", MediaSchema);
