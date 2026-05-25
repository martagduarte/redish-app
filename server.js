const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Base de dados temporária em memória
let activeReservations = [];
let transactionsVolume = 0;

// Servir o seu ficheiro HTML principal na raiz do site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'redish_app.html'));
});

// UC06: Endpoint para iniciar reserva e simular pagamento MB Way
app.post('/api/reservations', (req, res) => {
    const { surplusId, title, store, price } = req.body;
    
    const reservationId = "RES-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const qrToken = `REDISH-TOKEN-${reservationId}`;

    const newReservation = {
        id: reservationId,
        surplusId,
        title,
        store,
        price,
        status: "Pendente (Aguardando MB Way)",
        qrCodeToken: qrToken,
        createdAt: new Date()
    };

    activeReservations.push(newReservation);

    // Simulação do Webhook da Gateway de Pagamento (Aprova em 2 segundos)
    setTimeout(() => {
        const resToPay = activeReservations.find(r => r.id === reservationId);
        if (resToPay) {
            resToPay.status = "Pago e Confirmado";
            transactionsVolume += 1;
            console.log(`[Pagamento] Código ${reservationId} confirmado via MB Way.`);
        }
    }, 2500);

    res.json({ success: true, reservationId: reservationId });
});

// Obter o estado de uma reserva específica
app.get('/api/reservations/:id', (req, res) => {
    const resId = req.params.id;
    const reservation = activeReservations.find(r => r.id === resId);
    if (!reservation) return res.status(404).json({ error: "Não encontrada" });
    res.json(reservation);
});

// UC07: Endpoint para o Comerciante validar o QR Code no balcão (Check-in)
app.put('/api/reservations/checkin', (req, res) => {
    const { qrToken } = req.body;
    
    const reservation = activeReservations.find(r => r.qrCodeToken === qrToken);
    
    if (!reservation) {
        return res.json({ success: false, message: "QR Code inválido ou não pertence ao sistema ReDish." });
    }
    if (reservation.status === "Levantado") {
        return res.json({ success: false, message: "Aviso: Este QR Code já foi utilizado e o prato foi entregue." });
    }
    if (reservation.status !== "Pago e Confirmado") {
        return res.json({ success: false, message: "Erro: O pagamento desta reserva ainda não foi concluído." });
    }

    // Sucesso no Check-in
    reservation.status = "Levantado";
    res.json({ 
        success: true, 
        message: `Sucesso! Reserva ${reservation.id} validada. Entregar: ${reservation.title}.` 
    });
});

// Endpoint para o painel de métricas do administrador
app.get('/api/metrics', (req, res) => {
    res.json({ totalTransactions: transactionsVolume, reservations: activeReservations });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor ReDish a rodar em http://localhost:${PORT}`);
});
