BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[ScoringFrameworkGapItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [frameworkId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [notes] NVARCHAR(1000),
    [sortOrder] INT NOT NULL,
    CONSTRAINT [ScoringFrameworkGapItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

ALTER TABLE [dbo].[ScoringFrameworkGapItem] ADD CONSTRAINT [ScoringFrameworkGapItem_frameworkId_fkey]
FOREIGN KEY ([frameworkId]) REFERENCES [dbo].[ScoringFramework]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW
END CATCH
