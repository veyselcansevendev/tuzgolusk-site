PRAGMA foreign_keys=ON;

CREATE TABLE "Role" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "permissions" JSONB NOT NULL
);
CREATE UNIQUE INDEX "Role_key_key" ON "Role" ("key");

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "roleId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session" ("tokenHash");
CREATE INDEX "Session_expiresAt_idx" ON "Session" ("expiresAt");

CREATE TABLE "Throttle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Throttle_key_key" ON "Throttle" ("key");
CREATE INDEX "Throttle_resetAt_idx" ON "Throttle" ("resetAt");

CREATE TABLE "Invite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  CONSTRAINT "Invite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite" ("tokenHash");

CREATE TABLE "Audit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "recordId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Audit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Audit_module_createdAt_idx" ON "Audit" ("module", "createdAt");
CREATE INDEX "Audit_createdAt_idx" ON "Audit" ("createdAt");

CREATE TABLE "Revision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "module" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Revision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Revision_module_recordId_number_key" ON "Revision" ("module", "recordId", "number");

CREATE TABLE "Media" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
  "sha256" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt" TEXT NOT NULL,
  "credit" TEXT NOT NULL,
  "small" BOOLEAN NOT NULL DEFAULT false,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "uploaderId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Media_key_key" ON "Media" ("key");
CREATE INDEX "Media_createdAt_idx" ON "Media" ("createdAt");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'NEWS'
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category" ("slug");
CREATE INDEX "Category_status_deletedAt_publishAt_idx" ON "Category" ("status", "deletedAt", "publishAt");
CREATE INDEX "Category_position_idx" ON "Category" ("position");

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT
);
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag" ("slug");
CREATE INDEX "Tag_status_deletedAt_publishAt_idx" ON "Tag" ("status", "deletedAt", "publishAt");
CREATE INDEX "Tag_position_idx" ON "Tag" ("position");

CREATE TABLE "News" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "categoryId" TEXT,
  "coverId" TEXT,
  "matchId" TEXT,
  "playerId" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "News_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "News_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "News_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "News_slug_key" ON "News" ("slug");
CREATE INDEX "News_status_deletedAt_publishAt_idx" ON "News" ("status", "deletedAt", "publishAt");
CREATE INDEX "News_position_idx" ON "News" ("position");

CREATE TABLE "NewsTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "newsId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "NewsTag_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NewsTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NewsTag_newsId_tagId_key" ON "NewsTag" ("newsId", "tagId");

CREATE TABLE "NewsImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "newsId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "NewsImage_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NewsImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NewsImage_newsId_mediaId_key" ON "NewsImage" ("newsId", "mediaId");

CREATE TABLE "Page" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "coverId" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  CONSTRAINT "Page_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Page_slug_key" ON "Page" ("slug");
CREATE INDEX "Page_status_deletedAt_publishAt_idx" ON "Page" ("status", "deletedAt", "publishAt");
CREATE INDEX "Page_position_idx" ON "Page" ("position");

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "url" TEXT,
  "banner" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement" ("slug");
CREATE INDEX "Announcement_status_deletedAt_publishAt_idx" ON "Announcement" ("status", "deletedAt", "publishAt");
CREATE INDEX "Announcement_position_idx" ON "Announcement" ("position");

CREATE TABLE "Slide" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "coverId" TEXT,
  "mobileId" TEXT,
  "url" TEXT,
  "cta" TEXT,
  "video" TEXT,
  CONSTRAINT "Slide_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Slide_mobileId_fkey" FOREIGN KEY ("mobileId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Slide_slug_key" ON "Slide" ("slug");
CREATE INDEX "Slide_status_deletedAt_publishAt_idx" ON "Slide" ("status", "deletedAt", "publishAt");
CREATE INDEX "Slide_position_idx" ON "Slide" ("position");

CREATE TABLE "Navigation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "url" TEXT NOT NULL,
  "area" TEXT NOT NULL DEFAULT 'HEADER',
  "parentId" TEXT,
  "newWindow" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Navigation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Navigation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Navigation_slug_key" ON "Navigation" ("slug");
CREATE INDEX "Navigation_status_deletedAt_publishAt_idx" ON "Navigation" ("status", "deletedAt", "publishAt");
CREATE INDEX "Navigation_position_idx" ON "Navigation" ("position");

CREATE TABLE "Team" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'SENIOR',
  "logoId" TEXT,
  CONSTRAINT "Team_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Team_slug_key" ON "Team" ("slug");
CREATE INDEX "Team_status_deletedAt_publishAt_idx" ON "Team" ("status", "deletedAt", "publishAt");
CREATE INDEX "Team_position_idx" ON "Team" ("position");

CREATE TABLE "Season" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  "current" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "Season_slug_key" ON "Season" ("slug");
CREATE INDEX "Season_status_deletedAt_publishAt_idx" ON "Season" ("status", "deletedAt", "publishAt");
CREATE INDEX "Season_position_idx" ON "Season" ("position");

CREATE TABLE "TeamSeason" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  CONSTRAINT "TeamSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeamSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamSeason_teamId_seasonId_key" ON "TeamSeason" ("teamId", "seasonId");

CREATE TABLE "Competition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "logoId" TEXT,
  "win" INTEGER NOT NULL DEFAULT 3,
  "draw" INTEGER NOT NULL DEFAULT 1,
  "loss" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Competition_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition" ("slug");
CREATE INDEX "Competition_status_deletedAt_publishAt_idx" ON "Competition" ("status", "deletedAt", "publishAt");
CREATE INDEX "Competition_position_idx" ON "Competition" ("position");

CREATE TABLE "CompetitionSeason" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "competitionId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'AUTO',
  "source" TEXT,
  CONSTRAINT "CompetitionSeason_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CompetitionSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CompetitionSeason_competitionId_seasonId_key" ON "CompetitionSeason" ("competitionId", "seasonId");

CREATE TABLE "Opponent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "logoId" TEXT,
  CONSTRAINT "Opponent_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Opponent_slug_key" ON "Opponent" ("slug");
CREATE INDEX "Opponent_status_deletedAt_publishAt_idx" ON "Opponent" ("status", "deletedAt", "publishAt");
CREATE INDEX "Opponent_position_idx" ON "Opponent" ("position");

CREATE TABLE "Stadium" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "address" TEXT,
  "coverId" TEXT,
  CONSTRAINT "Stadium_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Stadium_slug_key" ON "Stadium" ("slug");
CREATE INDEX "Stadium_status_deletedAt_publishAt_idx" ON "Stadium" ("status", "deletedAt", "publishAt");
CREATE INDEX "Stadium_position_idx" ON "Stadium" ("position");

CREATE TABLE "Player" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "body" TEXT NOT NULL,
  "photoId" TEXT,
  "positionName" TEXT NOT NULL,
  "nationality" TEXT,
  "height" INTEGER,
  "foot" TEXT,
  CONSTRAINT "Player_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Player_slug_key" ON "Player" ("slug");
CREATE INDEX "Player_status_deletedAt_publishAt_idx" ON "Player" ("status", "deletedAt", "publishAt");
CREATE INDEX "Player_position_idx" ON "Player" ("position");

CREATE TABLE "PlayerSeason" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "teamSeasonId" TEXT NOT NULL,
  "shirt" INTEGER NOT NULL,
  "appearances" INTEGER NOT NULL DEFAULT 0,
  "goals" INTEGER NOT NULL DEFAULT 0,
  "assists" INTEGER NOT NULL DEFAULT 0,
  "minutes" INTEGER NOT NULL DEFAULT 0,
  "yellow" INTEGER NOT NULL DEFAULT 0,
  "red" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "PlayerSeason_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlayerSeason_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlayerSeason_playerId_teamSeasonId_key" ON "PlayerSeason" ("playerId", "teamSeasonId");
CREATE INDEX "PlayerSeason_teamSeasonId_visible_idx" ON "PlayerSeason" ("teamSeasonId", "visible");

CREATE TABLE "Staff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "roleName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "photoId" TEXT,
  "teamSeasonId" TEXT,
  CONSTRAINT "Staff_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Staff_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Staff_slug_key" ON "Staff" ("slug");
CREATE INDEX "Staff_status_deletedAt_publishAt_idx" ON "Staff" ("status", "deletedAt", "publishAt");
CREATE INDEX "Staff_position_idx" ON "Staff" ("position");

CREATE TABLE "Match" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "teamSeasonId" TEXT NOT NULL,
  "opponentId" TEXT NOT NULL,
  "competitionSeasonId" TEXT,
  "stadiumId" TEXT,
  "kickoff" DATETIME NOT NULL,
  "home" BOOLEAN NOT NULL DEFAULT true,
  "round" TEXT,
  "referee" TEXT,
  "broadcast" TEXT,
  "matchState" TEXT NOT NULL DEFAULT 'PLANNED',
  "clubScore" INTEGER,
  "opponentScore" INTEGER,
  "notes" TEXT,
  "albumId" TEXT,
  CONSTRAINT "Match_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Match_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Match_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Match_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "Stadium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Match_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Match_slug_key" ON "Match" ("slug");
CREATE INDEX "Match_status_deletedAt_publishAt_idx" ON "Match" ("status", "deletedAt", "publishAt");
CREATE INDEX "Match_position_idx" ON "Match" ("position");

CREATE TABLE "MatchEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "matchId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "minute" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "playerId" TEXT,
  "detail" TEXT NOT NULL,
  "side" TEXT NOT NULL DEFAULT 'CLUB',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MatchEvent_matchId_requestKey_key" ON "MatchEvent" ("matchId", "requestKey");
CREATE INDEX "MatchEvent_matchId_minute_idx" ON "MatchEvent" ("matchId", "minute");

CREATE TABLE "Lineup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "starter" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Lineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Lineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Lineup_matchId_playerId_key" ON "Lineup" ("matchId", "playerId");

CREATE TABLE "LeagueResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "competitionSeasonId" TEXT NOT NULL,
  "homeId" TEXT NOT NULL,
  "awayId" TEXT NOT NULL,
  "homeScore" INTEGER NOT NULL,
  "awayScore" INTEGER NOT NULL,
  "round" TEXT NOT NULL,
  CONSTRAINT "LeagueResult_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LeagueResult_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Opponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LeagueResult_awayId_fkey" FOREIGN KEY ("awayId") REFERENCES "Opponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LeagueResult_competitionSeasonId_homeId_awayId_round_key" ON "LeagueResult" ("competitionSeasonId", "homeId", "awayId", "round");

CREATE TABLE "Standing" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "competitionSeasonId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "won" INTEGER NOT NULL,
  "drawn" INTEGER NOT NULL,
  "lost" INTEGER NOT NULL,
  "scored" INTEGER NOT NULL,
  "conceded" INTEGER NOT NULL,
  "points" INTEGER NOT NULL,
  CONSTRAINT "Standing_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Standing_competitionSeasonId_rank_key" ON "Standing" ("competitionSeasonId", "rank");

CREATE TABLE "Album" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "coverId" TEXT,
  "categoryId" TEXT,
  CONSTRAINT "Album_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Album_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Album_slug_key" ON "Album" ("slug");
CREATE INDEX "Album_status_deletedAt_publishAt_idx" ON "Album" ("status", "deletedAt", "publishAt");
CREATE INDEX "Album_position_idx" ON "Album" ("position");

CREATE TABLE "AlbumImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "albumId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AlbumImage_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AlbumImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AlbumImage_albumId_mediaId_key" ON "AlbumImage" ("albumId", "mediaId");

CREATE TABLE "Video" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "summary" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "posterId" TEXT,
  "categoryId" TEXT,
  CONSTRAINT "Video_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Video_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Video_slug_key" ON "Video" ("slug");
CREATE INDEX "Video_status_deletedAt_publishAt_idx" ON "Video" ("status", "deletedAt", "publishAt");
CREATE INDEX "Video_position_idx" ON "Video" ("position");

CREATE TABLE "Sponsor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "logoId" TEXT,
  "url" TEXT,
  "categoryId" TEXT,
  "placement" TEXT NOT NULL DEFAULT 'BOTH',
  CONSTRAINT "Sponsor_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Sponsor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor" ("slug");
CREATE INDEX "Sponsor_status_deletedAt_publishAt_idx" ON "Sponsor" ("status", "deletedAt", "publishAt");
CREATE INDEX "Sponsor_position_idx" ON "Sponsor" ("position");

CREATE TABLE "SocialAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publishAt" DATETIME,
  "endAt" DATETIME,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "platform" TEXT NOT NULL,
  "url" TEXT NOT NULL
);
CREATE UNIQUE INDEX "SocialAccount_slug_key" ON "SocialAccount" ("slug");
CREATE INDEX "SocialAccount_status_deletedAt_publishAt_idx" ON "SocialAccount" ("status", "deletedAt", "publishAt");
CREATE INDEX "SocialAccount_position_idx" ON "SocialAccount" ("position");

CREATE TABLE "SiteSetting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting" ("key");

CREATE TABLE "HomeLayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "published" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "HomeLayout_key_key" ON "HomeLayout" ("key");

CREATE TABLE "Redirect" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fromPath" TEXT NOT NULL,
  "toPath" TEXT NOT NULL,
  "module" TEXT,
  "recordId" TEXT
);
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect" ("fromPath");
CREATE INDEX "Redirect_module_recordId_idx" ON "Redirect" ("module", "recordId");

CREATE TABLE "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'NEW',
  "consentAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" DATETIME
);
CREATE INDEX "Message_state_createdAt_idx" ON "Message" ("state", "createdAt");

CREATE TABLE "Design" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "canvas" JSONB NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'DRAFT',
  "template" BOOLEAN NOT NULL DEFAULT false,
  "ownerId" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "matchId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Design_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Design_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Design_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Design_template_updatedAt_idx" ON "Design" ("template", "updatedAt");

CREATE TABLE "DesignMedia" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "designId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  CONSTRAINT "DesignMedia_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DesignMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DesignMedia_designId_mediaId_key" ON "DesignMedia" ("designId", "mediaId");

CREATE TABLE "DesignExport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "designId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignExport_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DesignExport_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DesignExport_designId_createdAt_idx" ON "DesignExport" ("designId", "createdAt");

CREATE TABLE "SocialPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "hashtags" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" DATETIME,
  "matchId" TEXT,
  "newsId" TEXT,
  "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  "ownerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPost_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SocialPost_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SocialPost_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SocialPost_state_scheduledAt_idx" ON "SocialPost" ("state", "scheduledAt");

CREATE TABLE "SocialAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  CONSTRAINT "SocialAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SocialAsset_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SocialAsset_postId_mediaId_key" ON "SocialAsset" ("postId", "mediaId");

CREATE TABLE "BackupRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "BackupRecord_name_key" ON "BackupRecord" ("name");
