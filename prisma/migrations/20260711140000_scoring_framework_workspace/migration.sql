BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ScoringFramework] (
    [id] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScoringFramework_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScoringFramework_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScoringFrameworkTool] (
    [id] NVARCHAR(1000) NOT NULL,
    [frameworkId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL,
    CONSTRAINT [ScoringFrameworkTool_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScoringFrameworkCriterion] (
    [id] NVARCHAR(1000) NOT NULL,
    [frameworkId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [weight] FLOAT(53) NOT NULL,
    [sortOrder] INT NOT NULL,
    CONSTRAINT [ScoringFrameworkCriterion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScoringFrameworkScore] (
    [id] NVARCHAR(1000) NOT NULL,
    [frameworkId] NVARCHAR(1000) NOT NULL,
    [toolId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [score] INT,
    CONSTRAINT [ScoringFrameworkScore_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFramework] ADD CONSTRAINT [ScoringFramework_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFrameworkTool] ADD CONSTRAINT [ScoringFrameworkTool_frameworkId_fkey] FOREIGN KEY ([frameworkId]) REFERENCES [dbo].[ScoringFramework]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFrameworkCriterion] ADD CONSTRAINT [ScoringFrameworkCriterion_frameworkId_fkey] FOREIGN KEY ([frameworkId]) REFERENCES [dbo].[ScoringFramework]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFrameworkScore] ADD CONSTRAINT [ScoringFrameworkScore_frameworkId_fkey] FOREIGN KEY ([frameworkId]) REFERENCES [dbo].[ScoringFramework]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFrameworkScore] ADD CONSTRAINT [ScoringFrameworkScore_toolId_fkey] FOREIGN KEY ([toolId]) REFERENCES [dbo].[ScoringFrameworkTool]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScoringFrameworkScore] ADD CONSTRAINT [ScoringFrameworkScore_criterionId_fkey] FOREIGN KEY ([criterionId]) REFERENCES [dbo].[ScoringFrameworkCriterion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
