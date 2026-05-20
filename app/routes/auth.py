from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.models.usuario import Usuario, Fazenda, PapelUsuario, PERMISSOES_PADRAO, PERMISSOES_ADMIN
from app.services.auth_service import (
    hash_senha, verificar_senha, criar_token,
    get_usuario_by_email, get_usuario_atual, exigir_admin, exigir_super_admin,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    papel: str
    fazenda_id: Optional[int]
    fazenda_nome: Optional[str]
    permissoes: dict
    ativo: bool

    class Config:
        from_attributes = True


class FazendaOut(BaseModel):
    id: int
    nome: str
    ativo: bool

    class Config:
        from_attributes = True


class CriarFazendaRequest(BaseModel):
    nome: str


class CriarUsuarioRequest(BaseModel):
    nome: str
    email: str
    senha: str
    papel: PapelUsuario = PapelUsuario.FUNCIONARIO
    fazenda_id: Optional[int] = None
    permissoes: Optional[dict] = None


class AtualizarUsuarioRequest(BaseModel):
    nome: Optional[str] = None
    senha: Optional[str] = None
    papel: Optional[PapelUsuario] = None
    permissoes: Optional[dict] = None
    ativo: Optional[bool] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    usuario = await get_usuario_by_email(db, body.email)
    if not usuario or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")
    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário desativado.")
    token = criar_token({"sub": str(usuario.id)})
    return {"access_token": token}


@router.get("/me", response_model=UsuarioOut)
async def me(usuario: Usuario = Depends(get_usuario_atual), db: AsyncSession = Depends(get_db)):
    fazenda_nome = None
    if usuario.fazenda_id:
        result = await db.execute(select(Fazenda).where(Fazenda.id == usuario.fazenda_id))
        fazenda = result.scalar_one_or_none()
        fazenda_nome = fazenda.nome if fazenda else None
    return UsuarioOut(
        id=usuario.id, nome=usuario.nome, email=usuario.email,
        papel=usuario.papel.value, fazenda_id=usuario.fazenda_id,
        fazenda_nome=fazenda_nome, permissoes=usuario.permissoes or PERMISSOES_PADRAO,
        ativo=usuario.ativo,
    )


# ── Fazendas ─────────────────────────────────────────────────────────────────

@router.get("/fazendas", response_model=list[FazendaOut])
async def listar_fazendas(
    usuario: Usuario = Depends(exigir_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fazenda).order_by(Fazenda.nome))
    return result.scalars().all()


@router.post("/fazendas", response_model=FazendaOut, status_code=201)
async def criar_fazenda(
    body: CriarFazendaRequest,
    usuario: Usuario = Depends(exigir_super_admin),
    db: AsyncSession = Depends(get_db),
):
    fazenda = Fazenda(nome=body.nome)
    db.add(fazenda)
    await db.flush()
    return fazenda


# ── Usuários ─────────────────────────────────────────────────────────────────

@router.get("/usuarios", response_model=list[UsuarioOut])
async def listar_usuarios(
    admin: Usuario = Depends(exigir_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Usuario)
    if admin.papel == PapelUsuario.ADMIN_FAZENDA:
        q = q.where(Usuario.fazenda_id == admin.fazenda_id)
    result = await db.execute(q.order_by(Usuario.nome))
    usuarios = result.scalars().all()

    out = []
    fazenda_cache = {}
    for u in usuarios:
        nome_f = None
        if u.fazenda_id:
            if u.fazenda_id not in fazenda_cache:
                r = await db.execute(select(Fazenda).where(Fazenda.id == u.fazenda_id))
                f = r.scalar_one_or_none()
                fazenda_cache[u.fazenda_id] = f.nome if f else None
            nome_f = fazenda_cache[u.fazenda_id]
        out.append(UsuarioOut(
            id=u.id, nome=u.nome, email=u.email, papel=u.papel.value,
            fazenda_id=u.fazenda_id, fazenda_nome=nome_f,
            permissoes=u.permissoes or PERMISSOES_PADRAO, ativo=u.ativo,
        ))
    return out


@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
async def criar_usuario(
    body: CriarUsuarioRequest,
    admin: Usuario = Depends(exigir_admin),
    db: AsyncSession = Depends(get_db),
):
    existente = await get_usuario_by_email(db, body.email)
    if existente:
        raise HTTPException(status_code=400, detail="Email já cadastrado.")

    fazenda_id = body.fazenda_id
    if admin.papel == PapelUsuario.ADMIN_FAZENDA:
        fazenda_id = admin.fazenda_id

    permissoes = body.permissoes
    if permissoes is None:
        permissoes = PERMISSOES_ADMIN if body.papel in (PapelUsuario.ADMIN_FAZENDA, PapelUsuario.SUPER_ADMIN) else PERMISSOES_PADRAO

    novo = Usuario(
        nome=body.nome, email=body.email,
        senha_hash=hash_senha(body.senha),
        papel=body.papel, fazenda_id=fazenda_id,
        permissoes=permissoes, ativo=True,
    )
    db.add(novo)
    await db.flush()

    fazenda_nome = None
    if novo.fazenda_id:
        r = await db.execute(select(Fazenda).where(Fazenda.id == novo.fazenda_id))
        f = r.scalar_one_or_none()
        fazenda_nome = f.nome if f else None

    return UsuarioOut(
        id=novo.id, nome=novo.nome, email=novo.email, papel=novo.papel.value,
        fazenda_id=novo.fazenda_id, fazenda_nome=fazenda_nome,
        permissoes=novo.permissoes, ativo=novo.ativo,
    )


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
async def atualizar_usuario(
    usuario_id: int,
    body: AtualizarUsuarioRequest,
    admin: Usuario = Depends(exigir_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if admin.papel == PapelUsuario.ADMIN_FAZENDA and u.fazenda_id != admin.fazenda_id:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este usuário.")

    if body.nome is not None:
        u.nome = body.nome
    if body.senha is not None:
        u.senha_hash = hash_senha(body.senha)
    if body.papel is not None:
        u.papel = body.papel
    if body.permissoes is not None:
        u.permissoes = body.permissoes
    if body.ativo is not None:
        u.ativo = body.ativo

    await db.flush()

    fazenda_nome = None
    if u.fazenda_id:
        r = await db.execute(select(Fazenda).where(Fazenda.id == u.fazenda_id))
        f = r.scalar_one_or_none()
        fazenda_nome = f.nome if f else None

    return UsuarioOut(
        id=u.id, nome=u.nome, email=u.email, papel=u.papel.value,
        fazenda_id=u.fazenda_id, fazenda_nome=fazenda_nome,
        permissoes=u.permissoes or PERMISSOES_PADRAO, ativo=u.ativo,
    )
