"""Seed padron_alumnos with IDM semester 6 students

Revision ID: j3c4d5e6f7a8
Revises: i2b3c4d5e6f7
Create Date: 2026-04-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "j3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "i2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STUDENTS = [
    ("A01751999", "Vanessa Fernanda Bernal Hernández", "IDM", 6),
    ("A01665590", "Cristián Cruz Orozco", "IDM", 6),
    ("A01029592", "Paulina Díaz Arroyo", "IDM", 6),
    ("A01659511", "Helena Eridani Escandón López", "IDM", 6),
    ("A01659517", "Luis Emilio Fernández González", "IDM", 6),
    ("A01666131", "Ofelia Gabriela Góngora Méndez", "IDM", 6),
    ("A01667072", "Uziel Heredia Estrada", "IDM", 6),
    ("A01781749", "Andrés Kiewek García", "IDM", 6),
    ("A01659576", "Paulina Leal Mosqueda", "IDM", 6),
    ("A01659048", "Mauricio Loera Abundis", "IDM", 6),
    ("A01659339", "Franck Rodolfo Méndez Saint Louis", "IDM", 6),
    ("A01785622", "Juan Pablo Moral", "IDM", 6),
    ("A01025967", "Santiago Nava Figueroa", "IDM", 6),
    ("A01658529", "Armando Atanasio Navarrete Yépez", "IDM", 6),
    ("A01660110", "Edgar Samuel Oropeza García", "IDM", 6),
    ("A01666972", "Axel Palacios Granados", "IDM", 6),
    ("A01659947", "César Isao Pastelin Kohagura", "IDM", 6),
    ("A01659356", "Regina Pérez Vázquez", "IDM", 6),
    ("A01660757", "Fátima Quiroz Romero", "IDM", 6),
    ("A01660118", "Eduardo Ramírez Almanza", "IDM", 6),
    ("A01784220", "Marcos Saade Romano", "IDM", 6),
    ("A01659113", "Adrián Tavera Aquino", "IDM", 6),
    ("A01665122", "Sibyla Vera Avila", "IDM", 6),
    # Profesores con matrícula por defecto (login Google, acceso padrón)
    ("A09000001", "Alfonso Francisco De Abiega L'Eglisse", "IDM", 6),
    ("A09000002", "Ivan Ongay Valverde", "IDM", 6),
]


def upgrade() -> None:
    conn = op.get_bind()
    stmt = sa.text(
        """
        INSERT INTO padron_alumnos (id_matricula, nombre_completo, carrera, semestre)
        VALUES (:matricula, :nombre, :carrera, :semestre)
        ON CONFLICT (id_matricula) DO NOTHING
        """
    )
    for matricula, nombre, carrera, semestre in STUDENTS:
        conn.execute(
            stmt,
            {
                "matricula": matricula,
                "nombre": nombre,
                "carrera": carrera,
                "semestre": semestre,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    matriculas = [s[0] for s in STUDENTS]
    conn.execute(
        sa.text("DELETE FROM padron_alumnos WHERE id_matricula IN :matriculas").bindparams(
            sa.bindparam("matriculas", expanding=True)
        ),
        {"matriculas": matriculas},
    )
