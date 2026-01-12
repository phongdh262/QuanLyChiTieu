-- Data Dump created by Custom Script
SET FOREIGN_KEY_CHECKS=0;

INSERT INTO Workspace (id, name, ownerId, createdAt) VALUES (1, 'Nhóm Ăn Trưa', 'user-1', '2026-01-11 16:39:46');
INSERT INTO Workspace (id, name, ownerId, createdAt) VALUES (2, 'Test WS', 'u1', '2026-01-11 16:55:07');

INSERT INTO Member (id, name, email, username, password, role, workspaceId) VALUES (6, 'Phong', NULL, 'phong', '$2b$10$brXh2aQMIbu3rpylXw02QOg.LLYrP4c8a/pCEGvfho6b8cPnI343S', 'ADMIN', 1);
INSERT INTO Member (id, name, email, username, password, role, workspaceId) VALUES (7, 'Văn', NULL, 'van', '$2b$10$brXh2aQMIbu3rpylXw02QOg.LLYrP4c8a/pCEGvfho6b8cPnI343S', 'ADMIN', 1);
INSERT INTO Member (id, name, email, username, password, role, workspaceId) VALUES (8, 'Khôi', NULL, 'khoi', '$2b$10$brXh2aQMIbu3rpylXw02QOg.LLYrP4c8a/pCEGvfho6b8cPnI343S', 'ADMIN', 1);

INSERT INTO Sheet (id, name, month, year, status, createdAt, workspaceId) VALUES (2, 'Tháng 1/2026', 1, 2026, 'OPEN', '2026-01-11 16:55:07', 2);
INSERT INTO Sheet (id, name, month, year, status, createdAt, workspaceId) VALUES (5, 'Tháng 1/2026', 1, 2026, 'OPEN', '2026-01-12 04:47:39', 1);



SET FOREIGN_KEY_CHECKS=1;
