/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cvProcessing from "../cvProcessing.js";
import type * as departmentChat from "../departmentChat.js";
import type * as files from "../files.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as livekit from "../livekit.js";
import type * as mockData from "../mockData.js";
import type * as presence from "../presence.js";
import type * as privateData from "../privateData.js";
import type * as todos from "../todos.js";
import type * as vapi from "../vapi.js";
import type * as vapiSample from "../vapiSample.js";
import type * as videoAlerts from "../videoAlerts.js";
import type * as videoAnalysis from "../videoAnalysis.js";
import type * as videoFeeds from "../videoFeeds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cvProcessing: typeof cvProcessing;
  departmentChat: typeof departmentChat;
  files: typeof files;
  healthCheck: typeof healthCheck;
  http: typeof http;
  incidents: typeof incidents;
  livekit: typeof livekit;
  mockData: typeof mockData;
  presence: typeof presence;
  privateData: typeof privateData;
  todos: typeof todos;
  vapi: typeof vapi;
  vapiSample: typeof vapiSample;
  videoAlerts: typeof videoAlerts;
  videoAnalysis: typeof videoAnalysis;
  videoFeeds: typeof videoFeeds;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
