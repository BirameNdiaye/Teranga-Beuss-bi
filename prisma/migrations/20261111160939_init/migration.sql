-- CreateEnum
CREATE TYPE "Language" AS ENUM ('fr', 'wo', 'en');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('public', 'code', 'private');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('dore', 'sauge', 'bordeaux', 'minimal');

-- CreateEnum
CREATE TYPE "FontPair" AS ENUM ('script', 'classic', 'modern');

-- CreateEnum
CREATE TYPE "HeroLayout" AS ENUM ('centered', 'bottom', 'editorial');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'video', 'audio');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('yes', 'no', 'maybe');

-- CreateEnum
CREATE TYPE "RsvpSource" AS ENUM ('link', 'personal', 'qr');

-- CreateEnum
CREATE TYPE "GuestbookStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "preferredLanguage" "Language" NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "partnerOne" VARCHAR(80) NOT NULL,
    "partnerTwo" VARCHAR(80) NOT NULL,
    "story" TEXT,
    "thankYouMessage" TEXT,
    "shareMessage" VARCHAR(240),
    "status" "InvitationStatus" NOT NULL DEFAULT 'draft',
    "visibility" "Visibility" NOT NULL DEFAULT 'public',
    "accessCodeHash" VARCHAR(255),
    "rsvpDeadline" TIMESTAMP(3),
    "theme" "Theme" NOT NULL DEFAULT 'dore',
    "fontPair" "FontPair" NOT NULL DEFAULT 'script',
    "heroLayout" "HeroLayout" NOT NULL DEFAULT 'centered',
    "overlay" INTEGER NOT NULL DEFAULT 55,
    "accentColor" VARCHAR(9),
    "animations" BOOLEAN NOT NULL DEFAULT true,
    "coverId" TEXT,
    "videoId" TEXT,
    "musicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoOrganizer" (
    "invitationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoOrganizer_pkey" PRIMARY KEY ("invitationId","userId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "venue" VARCHAR(160),
    "address" VARCHAR(200),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "mapsUrl" VARCHAR(500),
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "url" VARCHAR(600) NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" VARCHAR(200) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(60) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30),
    "seats" INTEGER NOT NULL DEFAULT 1,
    "token" VARCHAR(64) NOT NULL,
    "group" VARCHAR(80),
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30),
    "attendance" "Attendance" NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "message" VARCHAR(500),
    "source" "RsvpSource" NOT NULL DEFAULT 'link',
    "ticketToken" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "scannedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestbookEntry" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "message" VARCHAR(600) NOT NULL,
    "status" "GuestbookStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestbookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" VARCHAR(191) NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_slug_key" ON "Invitation"("slug");

-- CreateIndex
CREATE INDEX "Invitation_ownerId_idx" ON "Invitation"("ownerId");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "CoOrganizer_userId_idx" ON "CoOrganizer"("userId");

-- CreateIndex
CREATE INDEX "Event_invitationId_position_idx" ON "Event"("invitationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");

-- CreateIndex
CREATE INDEX "Media_ownerId_idx" ON "Media"("ownerId");

-- CreateIndex
CREATE INDEX "GalleryItem_invitationId_position_idx" ON "GalleryItem"("invitationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryItem_invitationId_mediaId_key" ON "GalleryItem"("invitationId", "mediaId");

-- CreateIndex
CREATE INDEX "Contact_invitationId_idx" ON "Contact"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_token_key" ON "Guest"("token");

-- CreateIndex
CREATE INDEX "Guest_invitationId_idx" ON "Guest"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_guestId_key" ON "Rsvp"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_ticketToken_key" ON "Rsvp"("ticketToken");

-- CreateIndex
CREATE INDEX "Rsvp_invitationId_attendance_idx" ON "Rsvp"("invitationId", "attendance");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_rsvpId_key" ON "CheckIn"("rsvpId");

-- CreateIndex
CREATE INDEX "GuestbookEntry_invitationId_status_idx" ON "GuestbookEntry"("invitationId", "status");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoOrganizer" ADD CONSTRAINT "CoOrganizer_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoOrganizer" ADD CONSTRAINT "CoOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_rsvpId_fkey" FOREIGN KEY ("rsvpId") REFERENCES "Rsvp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
