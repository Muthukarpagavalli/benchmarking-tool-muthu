BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Category_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Tool] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [ourFirmStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Tool_ourFirmStatus_df] DEFAULT 'unknown',
    [ourFirmNotes] NVARCHAR(1000),
    CONSTRAINT [Tool_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Capability] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    CONSTRAINT [Capability_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ToolCapability] (
    [id] NVARCHAR(1000) NOT NULL,
    [toolId] NVARCHAR(1000) NOT NULL,
    [capabilityId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ToolCapability_status_df] DEFAULT 'unknown',
    [notes] NVARCHAR(1000),
    CONSTRAINT [ToolCapability_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScoringCriterion] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [weight] FLOAT(53) NOT NULL,
    [description] NVARCHAR(1000),
    [order] INT NOT NULL,
    CONSTRAINT [ScoringCriterion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ToolScore] (
    [id] NVARCHAR(1000) NOT NULL,
    [toolId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [score] INT,
    CONSTRAINT [ToolScore_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NewsEntry] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [toolId] NVARCHAR(1000),
    [date] DATETIME2 NOT NULL,
    [updateType] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(1000) NOT NULL,
    [sourceUrl] NVARCHAR(1000),
    [impact] NVARCHAR(1000) NOT NULL,
    [loggedBy] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [NewsEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PeerFirm] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [PeerFirm_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PeerAdoption] (
    [id] NVARCHAR(1000) NOT NULL,
    [peerFirmId] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [toolId] NVARCHAR(1000),
    [dateLogged] DATETIME2 NOT NULL,
    [sourceNote] NVARCHAR(1000) NOT NULL,
    [sourceUrl] NVARCHAR(1000),
    CONSTRAINT [PeerAdoption_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Tool] ADD CONSTRAINT [Tool_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Capability] ADD CONSTRAINT [Capability_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ToolCapability] ADD CONSTRAINT [ToolCapability_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ToolCapability] ADD CONSTRAINT [ToolCapability_capabilityId_fkey] FOREIGN KEY ([capabilityId]) REFERENCES [dbo].[Capability]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringCriterion] ADD CONSTRAINT [ScoringCriterion_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ToolScore] ADD CONSTRAINT [ToolScore_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ToolScore] ADD CONSTRAINT [ToolScore_criterionId_fkey] FOREIGN KEY ([criterionId]) REFERENCES [dbo].[ScoringCriterion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsEntry] ADD CONSTRAINT [NewsEntry_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsEntry] ADD CONSTRAINT [NewsEntry_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PeerAdoption] ADD CONSTRAINT [PeerAdoption_peerFirmId_fkey] FOREIGN KEY ([peerFirmId]) REFERENCES [dbo].[PeerFirm]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PeerAdoption] ADD CONSTRAINT [PeerAdoption_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PeerAdoption] ADD CONSTRAINT [PeerAdoption_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
