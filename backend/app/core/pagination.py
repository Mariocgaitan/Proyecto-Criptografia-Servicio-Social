"""
Generic pagination for SQLAlchemy async queries.
"""
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """
    Execute a paginated query.

    Args:
        db: Async database session
        query: SQLAlchemy Select statement
        page: Page number (1-based, min 1)
        page_size: Items per page (min 1, max 100)

    Returns:
        {
            "data": [...],
            "total": int,
            "page": int,
            "page_size": int,
            "pages": int,
        }
    """
    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    # Count total rows
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Calculate pages
    pages = max(1, -(-total // page_size))  # ceil division

    # Fetch page
    offset = (page - 1) * page_size
    rows = (await db.execute(query.offset(offset).limit(page_size))).all()

    return {
        "data": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
