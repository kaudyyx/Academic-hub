// Importa as bibliotecas necessárias
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Inicializa o servidor
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('uploads')); // Para servir imagens

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Adiciona timestamp ao nome do arquivo
    }
});
const upload = multer({ storage });

// Conecta ao MongoDB
mongoose.connect('mongodb://localhost:27017/Academichub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Conectado ao MongoDB!'))
  .catch(err => console.error('❌ Erro na conexão com o MongoDB:', err));

// Define o esquema do usuário
const UsuarioSchema = new mongoose.Schema({
    nome: String,
    email: { type: String, unique: true },
    senha: String
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Define o esquema do post
const PostSchema = new mongoose.Schema({
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    conteudo: String,
    imagem: String,
    curtidas: { type: Number, default: 0 },
    comentarios: [{ 
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        texto: String 
    }]
});
const Post = mongoose.model('Post', PostSchema);

// Rota de registro
app.post('/registrar', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos!' });
        }
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'Email já cadastrado!' });
        }
        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = new Usuario({ nome, email, senha: senhaHash });
        await novoUsuario.save();
        res.json({ success: true, message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Email não encontrado!' });
        }
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Senha incorreta!' });
        }
        res.json({ success: true, message: 'Login bem-sucedido!', usuarioId: usuario._id, nome: usuario.nome });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// Rota para criar um post
app.post('/posts', upload.single('imagem'), async (req, res) => {
    try {
        const { autor, conteudo } = req.body;
        const imagem = req.file ? req.file.path : null; // Caminho da imagem
        const novoPost = new Post({ autor, conteudo, imagem });
        await novoPost.save();
        res.json({ success: true, message: 'Post criado com sucesso!', post: novoPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao criar post' });
    }
});

// Rota para curtir um post
app.post('/posts/:id/curtir', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }
        post.curtidas++;
        await post.save();
        res.json({ success: true, message: 'Post curtido!', curtidas: post.curtidas });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao curtir post' });
    }
});

// Rota para adicionar um comentário
app.post('/posts/:id/comentarios', async (req, res) => {
    try {
        const { usuario, texto } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post não encontrado' });
        }
        post.comentarios.push({ usuario, texto });
        await post.save();
        res.json({ success: true, message: 'Comentário adicionado!', comentarios: post.comentarios });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao adicionar comentário' });
    }
});

// Rota para buscar todos os posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().populate('autor', 'nome').populate('comentarios.usuario', 'nome');
        res.json({ success: true, posts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
    }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
