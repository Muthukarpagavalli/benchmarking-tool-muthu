BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[ScoringFramework]
ADD [clientName] NVARCHAR(1000) NULL;

CREATE TABLE [dbo].[ScoringFrameworkStackItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [frameworkId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [sortOrder] INT NOT NULL,
    CONSTRAINT [ScoringFrameworkStackItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

ALTER TABLE [dbo].[ScoringFrameworkStackItem] ADD CONSTRAINT [ScoringFrameworkStackItem_frameworkId_fkey]
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
