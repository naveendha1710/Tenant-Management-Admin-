const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Get all assets
router.get('/assets', async (req, res) => {
  try {
    const { bond_type, status } = req.query;
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    
    if (bond_type) query = query.eq('bond_type', bond_type);
    if (status) query = query.eq('asset_status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/assets/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('assets').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/assets', async (req, res) => {
  try {
    const { data: assetId } = await supabase.rpc('generate_asset_id');
    const { data, error } = await supabase.from('assets').insert({ ...req.body, asset_id: assetId }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/assets/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('assets').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/assets/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('assets').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/movements', async (req, res) => {
  try {
    const { asset_id } = req.query;
    let query = supabase.from('asset_movements').select('*, assets(asset_id, asset_name)').order('created_at', { ascending: false });
    if (asset_id) query = query.eq('asset_id', asset_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/movements', async (req, res) => {
  try {
    const { data: requestNumber } = await supabase.rpc('generate_movement_request_number');
    const { data, error } = await supabase.from('asset_movements').insert({ ...req.body, request_number: requestNumber }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/movements/:id/status', async (req, res) => {
  try {
    const { status, actual_movement_date } = req.body;
    const { data, error } = await supabase.from('asset_movements').update({ movement_status: status, actual_movement_date }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard/stats', async (req, res) => {
  try {
    const { data: assets } = await supabase.from('assets').select('*');
    const { data: movements } = await supabase.from('asset_movements').select('*').eq('movement_status', 'Pending');
    const { data: maintenance } = await supabase.from('asset_maintenance').select('*').in('maintenance_status', ['Scheduled', 'In Progress']);
    
    const totalAssets = assets?.length || 0;
    const bondedAssets = assets?.filter(a => a.bond_type === 'Bonded').length || 0;
    const assetValueGross = assets?.reduce((sum, a) => sum + (a.asset_cost || 0), 0) || 0;
    const assetValueNet = assets?.reduce((sum, a) => sum + (a.net_book_value || 0), 0) || 0;
    const dutyForegoneAmount = assets?.filter(a => a.bond_type === 'Bonded').reduce((sum, a) => sum + (a.duty_foregone_amount || 0), 0) || 0;
    
    const today = new Date().toISOString().split('T')[0];
    const movementToday = movements?.filter(m => m.created_at?.startsWith(today)).length || 0;
    
    res.json({
      success: true,
      data: {
        totalAssets, bondedAssets, assetValueGross, assetValueNet, dutyForegoneAmount,
        pendingApprovals: movements?.length || 0,
        underMaintenance: maintenance?.length || 0,
        auditDue: 0, warrantyExpiring: 0, movementToday
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
